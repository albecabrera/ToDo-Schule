<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Models\Attachment;
use App\Models\Note;
use App\Models\Task;

/**
 * SearchController
 * -----------------------------------------------------------------------------
 * Globale Suche über Aufgaben, Notizen und Anhänge.
 * GET /api/search?q=&limit=20
 */
final class SearchController
{
    public static function search(Request $req): void
    {
        $q = trim($req->query['q'] ?? '');
        if (strlen($q) < 2) {
            Response::json(['tasks' => [], 'notes' => [], 'attachments' => []]);
            return;
        }

        $userId = $req->userId();
        $limit  = min(20, max(1, (int) ($req->query['limit'] ?? 10)));

        $tasks       = self::searchTasks($userId, $q, $limit);
        $notes       = self::searchNotes($userId, $q, $limit);
        $attachments = self::searchAttachments($userId, $q, $limit);

        Response::json([
            'tasks'       => $tasks,
            'notes'       => $notes,
            'attachments' => $attachments,
            'total'       => count($tasks) + count($notes) + count($attachments),
        ]);
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────

    private static function searchTasks(int $userId, string $q, int $limit): array
    {
        $tasks = Task::allForUser($userId, ['q' => $q]);
        return array_slice($tasks, 0, $limit);
    }

    // ── Notes ─────────────────────────────────────────────────────────────────

    private static function searchNotes(int $userId, string $q, int $limit): array
    {
        $pdo  = \App\Models\Model::db();
        $like = '%' . $q . '%';
        $stmt = $pdo->prepare(
            'SELECT DISTINCT n.id, n.title, n.kind, n.team_id, n.updated_at, u.name AS author_name
             FROM notes n
             JOIN users u ON u.id = n.created_by
             LEFT JOIN team_members tm ON tm.team_id = n.team_id
             WHERE (n.created_by = :u1 OR tm.user_id = :u2)
               AND (n.title LIKE :q OR n.content LIKE :q2)
             ORDER BY n.updated_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue(':u1', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':u2', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':q', $like);
        $stmt->bindValue(':q2', $like);
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    private static function searchAttachments(int $userId, string $q, int $limit): array
    {
        $pdo  = \App\Models\Model::db();
        $like = '%' . $q . '%';
        $stmt = $pdo->prepare(
            'SELECT a.id, a.original_name, a.mime_type, a.size, a.task_id, a.note_id, a.created_at,
                    t.title AS task_title, n.title AS note_title
             FROM attachments a
             LEFT JOIN tasks t ON t.id = a.task_id
             LEFT JOIN notes n ON n.id = a.note_id
             LEFT JOIN task_assignees ta ON ta.task_id = a.task_id
             LEFT JOIN team_members tm ON (tm.team_id = t.team_id OR tm.team_id = n.team_id)
             WHERE a.original_name LIKE :q
               AND (t.created_by = :u1 OR ta.user_id = :u2 OR tm.user_id = :u3
                    OR n.created_by = :u4)
             GROUP BY a.id
             ORDER BY a.created_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue(':q', $like);
        $stmt->bindValue(':u1', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':u2', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':u3', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':u4', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
