<?php

declare(strict_types=1);

namespace App\Models;

final class ChatMessage extends Model
{
    public static function recent(int $limit = 60): array
    {
        $stmt = self::db()->prepare(
            'SELECT m.*, u.name AS user_name
             FROM chat_messages m
             LEFT JOIN users u ON u.id = m.user_id
             ORDER BY m.created_at ASC
             LIMIT :lim'
        );
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function create(int $userId, string $content): array
    {
        $pdo = self::db();
        $pdo->prepare(
            'INSERT INTO chat_messages (user_id, content) VALUES (:uid, :content)'
        )->execute([':uid' => $userId, ':content' => $content]);
        $id   = (int) $pdo->lastInsertId();
        $stmt = self::db()->prepare(
            'SELECT m.*, u.name AS user_name FROM chat_messages m
             LEFT JOIN users u ON u.id = m.user_id WHERE m.id = :id'
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }
}
