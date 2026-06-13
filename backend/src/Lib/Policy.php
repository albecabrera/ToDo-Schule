<?php

declare(strict_types=1);

namespace App\Lib;

use App\Models\Task;
use App\Models\Team;

/**
 * Policy
 * -----------------------------------------------------------------------------
 * Zentrale Autorisierungsregeln rund um Aufgaben. Wirft 403/404 statt boolescher
 * Rückgaben, damit Controller schlank bleiben.
 */
final class Policy
{
    /** Lädt eine Aufgabe oder wirft 404. */
    public static function task(int $taskId): array
    {
        $task = Task::find($taskId);
        if ($task === null) {
            throw HttpException::notFound('Aufgabe nicht gefunden', 'task_not_found');
        }
        return $task;
    }

    /** Darf der Nutzer die Aufgabe sehen? (Ersteller, zugewiesen oder Teammitglied) */
    public static function canView(array $task, int $userId): bool
    {
        if ((int) $task['created_by'] === $userId) {
            return true;
        }
        if (in_array($userId, Task::assigneeIds((int) $task['id']), true)) {
            return true;
        }
        if (!empty($task['team_id']) && Team::isMember((int) $task['team_id'], $userId)) {
            return true;
        }
        return false;
    }

    public static function assertView(array $task, int $userId): void
    {
        if (!self::canView($task, $userId)) {
            throw HttpException::forbidden('Kein Zugriff auf diese Aufgabe', 'task_forbidden');
        }
    }

    /** Bearbeiten dürfen: Ersteller, Zugewiesene und Teammitglieder. */
    public static function assertEdit(array $task, int $userId): void
    {
        self::assertView($task, $userId);
    }

    /** Verwalten (löschen, teilen): nur der Ersteller. */
    public static function assertOwner(array $task, int $userId): void
    {
        if ((int) $task['created_by'] !== $userId) {
            throw HttpException::forbidden('Nur der Ersteller darf diese Aktion ausführen', 'not_owner');
        }
    }

    /** Liefert die Channels, an die ein Task-Event gesendet werden soll. */
    public static function taskChannels(array $task): array
    {
        $channels = [Emitter::user((int) $task['created_by'])];
        foreach (Task::assigneeIds((int) $task['id']) as $uid) {
            $channels[] = Emitter::user($uid);
        }
        if (!empty($task['team_id'])) {
            $channels[] = Emitter::team((int) $task['team_id']);
        }
        return array_values(array_unique($channels));
    }
}
