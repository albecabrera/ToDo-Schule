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

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare(
            'SELECT m.*, u.name AS user_name
             FROM chat_messages m
             LEFT JOIN users u ON u.id = m.user_id
             WHERE m.id = :id'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function updateContent(int $id, string $content): array
    {
        self::db()->prepare('UPDATE chat_messages SET content = :c WHERE id = :id')
            ->execute([':c' => $content, ':id' => $id]);
        return self::find($id);
    }

    public static function remove(int $id): void
    {
        self::db()->prepare('DELETE FROM chat_messages WHERE id = :id')
            ->execute([':id' => $id]);
    }

    /* ── Reaktionen ─────────────────────────────────────────────────────── */

    /** Reaktion an-/abschalten. @return 'added'|'removed' */
    public static function toggleReaction(int $messageId, int $userId, string $emoji): string
    {
        $pdo = self::db();
        $sel = $pdo->prepare('SELECT id FROM chat_reactions WHERE message_id=:m AND user_id=:u AND emoji=:e');
        $sel->execute([':m' => $messageId, ':u' => $userId, ':e' => $emoji]);
        if ($sel->fetchColumn() !== false) {
            $pdo->prepare('DELETE FROM chat_reactions WHERE message_id=:m AND user_id=:u AND emoji=:e')
                ->execute([':m' => $messageId, ':u' => $userId, ':e' => $emoji]);
            return 'removed';
        }
        $pdo->prepare('INSERT INTO chat_reactions (message_id, user_id, emoji) VALUES (:m,:u,:e)')
            ->execute([':m' => $messageId, ':u' => $userId, ':e' => $emoji]);
        return 'added';
    }

    /** Alle Reaktionen einer Nachricht: [{emoji, user_id, user_name}, …] */
    public static function reactionsFor(int $messageId): array
    {
        $stmt = self::db()->prepare(
            'SELECT r.emoji, r.user_id, u.name AS user_name
             FROM chat_reactions r LEFT JOIN users u ON u.id = r.user_id
             WHERE r.message_id = :m ORDER BY r.created_at ASC'
        );
        $stmt->execute([':m' => $messageId]);
        return $stmt->fetchAll();
    }

    /** Reaktionen für eine Liste von Nachrichten gebündelt: messageId => [reactions]. */
    public static function reactionsForMany(array $messageIds): array
    {
        if ($messageIds === []) {
            return [];
        }
        $in  = implode(',', array_fill(0, count($messageIds), '?'));
        $stmt = self::db()->prepare(
            "SELECT r.message_id, r.emoji, r.user_id, u.name AS user_name
             FROM chat_reactions r LEFT JOIN users u ON u.id = r.user_id
             WHERE r.message_id IN ($in) ORDER BY r.created_at ASC"
        );
        $stmt->execute(array_map('intval', $messageIds));
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[(int) $row['message_id']][] = [
                'emoji'     => $row['emoji'],
                'user_id'   => (int) $row['user_id'],
                'user_name' => $row['user_name'],
            ];
        }
        return $out;
    }

    /* ── Lesebestätigungen (DM) ─────────────────────────────────────────── */

    public static function markRead(int $userId, int $peerId, int $lastReadId): void
    {
        self::db()->prepare(
            'INSERT INTO chat_reads (user_id, peer_id, last_read_id, updated_at)
             VALUES (:u, :p, :l, datetime(\'now\'))
             ON CONFLICT(user_id, peer_id) DO UPDATE SET
                last_read_id = MAX(last_read_id, excluded.last_read_id),
                updated_at   = excluded.updated_at'
        )->execute([':u' => $userId, ':p' => $peerId, ':l' => $lastReadId]);
    }

    /** Bis zu welcher Nachrichten-ID hat $peerId die DMs von $userId gelesen? */
    public static function lastReadBy(int $peerId, int $userId): int
    {
        $stmt = self::db()->prepare(
            'SELECT last_read_id FROM chat_reads WHERE user_id = :p AND peer_id = :u'
        );
        $stmt->execute([':p' => $peerId, ':u' => $userId]);
        return (int) ($stmt->fetchColumn() ?: 0);
    }
}
