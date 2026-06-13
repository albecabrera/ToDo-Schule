<?php

declare(strict_types=1);

namespace App\Models;

/**
 * ShareLink
 * -----------------------------------------------------------------------------
 * Öffentliche Share-Links zu einer Aufgabe (Token, Berechtigung, Ablaufdatum).
 */
final class ShareLink extends Model
{
    public static function createOrReplace(int $taskId, int $userId, string $permission, ?string $expiresAt): array
    {
        // Bestehende aktive Links für diese Aufgabe deaktivieren (ein aktiver Link je Aufgabe).
        self::db()->prepare('UPDATE share_links SET active = 0 WHERE task_id = :t')
            ->execute([':t' => $taskId]);

        $token = self::randomToken(24);
        self::db()->prepare(
            'INSERT INTO share_links (task_id, token, permission, expires_at, created_by)
             VALUES (:t, :tok, :perm, :exp, :by)'
        )->execute([
            ':t' => $taskId, ':tok' => $token, ':perm' => $permission,
            ':exp' => $expiresAt, ':by' => $userId,
        ]);

        return self::findByToken($token);
    }

    public static function findByToken(string $token): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM share_links WHERE token = :tok');
        $stmt->execute([':tok' => $token]);
        return $stmt->fetch() ?: null;
    }

    public static function findActiveByToken(string $token): ?array
    {
        $stmt = self::db()->prepare(
            'SELECT * FROM share_links
             WHERE token = :tok AND active = 1
               AND (expires_at IS NULL OR expires_at > NOW())'
        );
        $stmt->execute([':tok' => $token]);
        return $stmt->fetch() ?: null;
    }

    public static function deactivateForTask(int $taskId): void
    {
        self::db()->prepare('UPDATE share_links SET active = 0 WHERE task_id = :t')
            ->execute([':t' => $taskId]);
    }
}
