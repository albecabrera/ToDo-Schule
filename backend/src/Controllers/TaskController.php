<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Policy;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;

/**
 * TaskController
 * -----------------------------------------------------------------------------
 * CRUD für Aufgaben + Zuweisungen. Schreibt Audit-Logs und broadcastet
 * Echtzeit-Events (über die events-Tabelle an den WebSocket-Server).
 */
final class TaskController
{
    public static function index(Request $req): void
    {
        $filters = [
            'status' => $req->query['status'] ?? null,
            'teamId' => $req->query['teamId'] ?? null,
            'q'      => !empty($req->query['q']) ? trim($req->query['q']) : null,
        ];
        $tasks = Task::allForUser($req->userId(), $filters);
        Response::json(['tasks' => $tasks]);
    }

    public static function show(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertView($task, $req->userId());
        Response::json(['task' => $task]);
    }

    public static function store(Request $req): void
    {
        $data = Validator::make($req->body, [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'status'      => 'nullable|in:todo,in_progress,done',
            'priority'    => 'nullable|in:low,medium,high',
            'dueDate'     => 'nullable|date',
            'remindAt'    => 'nullable|date',
            'teamId'      => 'nullable|int',
            'assignees'   => 'nullable|array',
            'tags'        => 'nullable|array',
            'subtasks'    => 'nullable|array',
        ]);

        if (!empty($data['teamId']) && !Team::isMember((int) $data['teamId'], $req->userId())) {
            throw HttpException::forbidden('Du bist kein Mitglied dieses Teams', 'not_team_member');
        }

        $data['dueDate']  = self::normalizeDate($data['dueDate']  ?? null);
        $data['remindAt'] = self::normalizeDate($data['remindAt'] ?? null);
        $task = Task::create($data, $req->userId());

        AuditLog::record((int) $task['id'], $req->userId(), 'task.created', [
            'title' => $task['title'],
        ]);

        // Echtzeit: an alle Beteiligten + ggf. Team senden.
        Emitter::emitMany(Policy::taskChannels($task), 'task:created', ['task' => $task]);
        self::notifyAssignees($task, $req->userId(), null);

        Response::json(['task' => $task], 201);
    }

    public static function update(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertEdit($task, $req->userId());

        $data = Validator::make($req->body, [
            'title'       => 'nullable|string|max:255',
            'description' => 'nullable|string|max:5000',
            'status'      => 'nullable|in:todo,in_progress,done',
            'priority'    => 'nullable|in:low,medium,high',
            'dueDate'     => 'nullable|date',
            'remindAt'    => 'nullable|date',
            'teamId'      => 'nullable|int',
            'assignees'   => 'nullable|array',
            'tags'        => 'nullable|array',
            'subtasks'    => 'nullable|array',
        ]);

        if (array_key_exists('dueDate', $data)) {
            $data['dueDate'] = self::normalizeDate($data['dueDate']);
        }
        if (array_key_exists('remindAt', $data)) {
            $data['remindAt'] = self::normalizeDate($data['remindAt']);
        }

        [$updated, $changes] = Task::update((int) $task['id'], $data);

        if ($changes !== []) {
            AuditLog::record((int) $updated['id'], $req->userId(), 'task.updated', $changes);
        }

        Emitter::emitMany(Policy::taskChannels($updated), 'task:updated', [
            'task'    => $updated,
            'changes' => $changes,
        ]);

        Response::json(['task' => $updated]);
    }

    public static function destroy(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertOwner($task, $req->userId());

        $channels = Policy::taskChannels($task);
        AuditLog::record((int) $task['id'], $req->userId(), 'task.deleted', ['title' => $task['title']]);
        Task::delete((int) $task['id']);

        Emitter::emitMany($channels, 'task:deleted', ['taskId' => (int) $task['id']]);

        Response::noContent();
    }

    // --- Zuweisungen ----------------------------------------------------------

    public static function assign(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertEdit($task, $req->userId());

        $data = Validator::make($req->body, ['userIds' => 'required|array|min:1']);
        $userIds = array_map('intval', $data['userIds']);

        // Nur existierende Nutzer zuweisen.
        $valid = array_column(User::findMany($userIds), 'id');
        $valid = array_map('intval', $valid);

        Task::addAssignees((int) $task['id'], $valid);
        $updated = Task::find((int) $task['id']);

        AuditLog::record((int) $task['id'], $req->userId(), 'task.assigned', [
            'assignees' => $valid,
        ]);

        Emitter::emitMany(Policy::taskChannels($updated), 'task:updated', ['task' => $updated]);
        self::notifyAssignees($updated, $req->userId(), $valid);

        Response::json(['task' => $updated]);
    }

    public static function unassign(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertEdit($task, $req->userId());

        $data = Validator::make($req->body, ['userIds' => 'required|array|min:1']);
        $userIds = array_map('intval', $data['userIds']);

        Task::removeAssignees((int) $task['id'], $userIds);
        $updated = Task::find((int) $task['id']);

        AuditLog::record((int) $task['id'], $req->userId(), 'task.unassigned', [
            'removed' => $userIds,
        ]);

        Emitter::emitMany(
            array_merge(Policy::taskChannels($updated), array_map([Emitter::class, 'user'], $userIds)),
            'task:updated',
            ['task' => $updated]
        );

        Response::json(['task' => $updated]);
    }

    // --- Helfer ---------------------------------------------------------------

    /** Sendet user:assigned an neu zugewiesene Nutzer (außer den Auslöser). */
    private static function notifyAssignees(array $task, int $actorId, ?array $only): void
    {
        $targets = $only ?? $task['assignees'];
        foreach ($targets as $uid) {
            $uid = (int) $uid;
            if ($uid === $actorId) {
                continue;
            }
            Emitter::emit(Emitter::user($uid), 'user:assigned', [
                'taskId' => (int) $task['id'],
                'title'  => $task['title'],
                'by'     => $actorId,
            ]);
            // Persistente Benachrichtigung in DB
            try {
                Notification::create([
                    'user_id'  => $uid,
                    'type'     => 'assigned',
                    'actor_id' => $actorId,
                    'task_id'  => (int) $task['id'],
                    'text'     => "hat dich bei <b>{$task['title']}</b> als Verantwortliche:n eingetragen",
                ]);
            } catch (\Throwable) {
                // Notifications-Tabelle evtl. noch nicht migriert — ignorieren
            }
        }
    }

    private static function normalizeDate(?string $date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }
        $ts = strtotime($date);
        return $ts === false ? null : date('Y-m-d H:i:s', $ts);
    }
}
