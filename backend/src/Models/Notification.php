<?php

declare(strict_types=1);

namespace App\Models;

final class Notification extends Model
{
    public static function allForUser(int $userId, int $limit = 60): array
    {
        $stmt = self::db()->prepare(
            'SELECT n.*, u.name AS actor_name
             FROM notifications n
             LEFT JOIN users u ON u.id = n.actor_id
             WHERE n.user_id = :uid
             ORDER BY n.created_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue(':uid', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit,  \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function create(array $data): array
    {
        $pdo = self::db();
        $pdo->prepare(
            'INSERT INTO notifications (user_id, type, actor_id, task_id, text)
             VALUES (:user_id, :type, :actor_id, :task_id, :text)'
        )->execute([
            ':user_id'  => (int) $data['user_id'],
            ':type'     => $data['type'],
            ':actor_id' => $data['actor_id'] ?? null,
            ':task_id'  => $data['task_id']  ?? null,
            ':text'     => $data['text'],
        ]);
        $id   = (int) $pdo->lastInsertId();
        $stmt = self::db()->prepare('SELECT * FROM notifications WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    public static function markRead(int $id, int $userId): void
    {
        self::db()->prepare(
            'UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid'
        )->execute([':id' => $id, ':uid' => $userId]);
    }

    public static function markAllRead(int $userId): void
    {
        self::db()->prepare(
            'UPDATE notifications SET is_read = 1 WHERE user_id = :uid'
        )->execute([':uid' => $userId]);
    }

    public static function deleteOld(int $userId, int $keepDays = 30): void
    {
        self::db()->prepare(
            "DELETE FROM notifications WHERE user_id = :uid AND created_at < datetime('now', '-' || :d || ' days')"
        )->execute([':uid' => $userId, ':d' => $keepDays]);
    }
}
