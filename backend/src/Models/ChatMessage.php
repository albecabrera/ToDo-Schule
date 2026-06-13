<?php

declare(strict_types=1);

namespace App\Models;

final class ChatMessage extends Model
{
    /**
     * Returns the last $limit messages for a thread.
     *   $recipientId = null  → Kollegiumschat (group, no recipient)
     *   $recipientId = int   → DM thread between $userId and $recipientId
     */
    public static function recent(int $limit = 100, ?int $userId = null, ?int $recipientId = null): array
    {
        if ($recipientId === null) {
            $stmt = self::db()->prepare(
                'SELECT m.*, u.name AS user_name
                 FROM chat_messages m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE m.recipient_id IS NULL
                 ORDER BY m.created_at ASC
                 LIMIT :lim'
            );
            $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        } else {
            $stmt = self::db()->prepare(
                'SELECT m.*, u.name AS user_name
                 FROM chat_messages m
                 LEFT JOIN users u ON u.id = m.user_id
                 WHERE (m.user_id = :me AND m.recipient_id = :them)
                    OR (m.user_id = :them2 AND m.recipient_id = :me2)
                 ORDER BY m.created_at ASC
                 LIMIT :lim'
            );
            $stmt->bindValue(':me',    $userId,      \PDO::PARAM_INT);
            $stmt->bindValue(':them',  $recipientId, \PDO::PARAM_INT);
            $stmt->bindValue(':me2',   $userId,      \PDO::PARAM_INT);
            $stmt->bindValue(':them2', $recipientId, \PDO::PARAM_INT);
            $stmt->bindValue(':lim',   $limit,       \PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function create(
        int $userId,
        string $content,
        ?int $recipientId = null,
        ?string $attachmentUrl = null,
        ?string $attachmentName = null
    ): array {
        $pdo = self::db();
        $pdo->prepare(
            'INSERT INTO chat_messages (user_id, content, recipient_id, attachment_url, attachment_name)
             VALUES (:uid, :content, :rid, :aurl, :aname)'
        )->execute([
            ':uid'   => $userId,
            ':content' => $content,
            ':rid'   => $recipientId,
            ':aurl'  => $attachmentUrl,
            ':aname' => $attachmentName,
        ]);
        $id   = (int) $pdo->lastInsertId();
        $stmt = self::db()->prepare(
            'SELECT m.*, u.name AS user_name
             FROM chat_messages m
             LEFT JOIN users u ON u.id = m.user_id
             WHERE m.id = :id'
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }
}
