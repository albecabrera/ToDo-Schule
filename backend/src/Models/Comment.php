<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Comment
 * -----------------------------------------------------------------------------
 * Kommentare / Notizen zu einer Aufgabe.
 */
final class Comment extends Model
{
    public static function listForTask(int $taskId): array
    {
        $stmt = self::db()->prepare(
            'SELECT c.id, c.task_id, c.user_id, c.content, c.created_at,
                    u.name AS user_name, u.email AS user_email
             FROM comments c
             JOIN users u ON u.id = c.user_id
             WHERE c.task_id = :t
             ORDER BY c.created_at ASC'
        );
        $stmt->execute([':t' => $taskId]);
        return $stmt->fetchAll();
    }

    public static function create(int $taskId, int $userId, string $content): array
    {
        $pdo = self::db();
        $pdo->prepare('INSERT INTO comments (task_id, user_id, content) VALUES (:t, :u, :c)')
            ->execute([':t' => $taskId, ':u' => $userId, ':c' => $content]);
        return self::find((int) $pdo->lastInsertId());
    }

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM comments WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function delete(int $id): void
    {
        self::db()->prepare('DELETE FROM comments WHERE id = :id')->execute([':id' => $id]);
    }
}
