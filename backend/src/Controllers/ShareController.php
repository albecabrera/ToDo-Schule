<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\HttpException;
use App\Lib\Policy;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\AuditLog;
use App\Models\ShareLink;
use App\Models\Task;
use App\Models\User;

/**
 * ShareController
 * -----------------------------------------------------------------------------
 * Share-Link erstellen/deaktivieren (geschützt) und öffentlicher Abruf per Token.
 */
final class ShareController
{
    /** POST /api/tasks/:id/share — nur Ersteller. */
    public static function create(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertOwner($task, $req->userId());

        $data = Validator::make($req->body, [
            'permission' => 'nullable|in:view,edit',
            'expiresAt'  => 'nullable|date',
        ]);

        $permission = $data['permission'] ?? 'view';
        $expiresAt  = !empty($data['expiresAt']) ? date('Y-m-d H:i:s', strtotime($data['expiresAt'])) : null;

        $link = ShareLink::createOrReplace((int) $task['id'], $req->userId(), $permission, $expiresAt);

        AuditLog::record((int) $task['id'], $req->userId(), 'task.shared', [
            'permission' => $permission,
            'expiresAt'  => $expiresAt,
        ]);

        Response::json([
            'share' => [
                'token'      => $link['token'],
                'url'        => '/api/share/' . $link['token'],
                'permission' => $link['permission'],
                'expiresAt'  => $link['expires_at'],
            ],
        ], 201);
    }

    /** GET /api/share/:token — ÖFFENTLICH, kein JWT. */
    public static function public(Request $req): void
    {
        $link = ShareLink::findActiveByToken($req->param('token'));
        if ($link === null) {
            throw HttpException::notFound('Share-Link ungültig oder abgelaufen', 'share_invalid');
        }

        $task = Task::find((int) $link['task_id']);
        if ($task === null) {
            throw HttpException::notFound('Aufgabe nicht mehr vorhanden', 'task_not_found');
        }

        // Ersteller-Anzeigename ergänzen (öffentlich, ohne sensible Daten).
        $creator = User::find((int) $task['created_by']);

        Response::json([
            'task' => [
                'id'          => (int) $task['id'],
                'title'       => $task['title'],
                'description' => $task['description'],
                'status'      => $task['status'],
                'priority'    => $task['priority'],
                'dueDate'     => $task['due_date'],
                'createdBy'   => $creator['name'] ?? 'Unbekannt',
                'createdAt'   => $task['created_at'],
            ],
            'permission' => $link['permission'],
        ]);
    }

    /** DELETE /api/tasks/:id/share — nur Ersteller. */
    public static function destroy(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertOwner($task, $req->userId());

        ShareLink::deactivateForTask((int) $task['id']);
        AuditLog::record((int) $task['id'], $req->userId(), 'task.unshared', []);

        Response::noContent();
    }
}
