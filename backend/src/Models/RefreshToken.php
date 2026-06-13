<?php

declare(strict_types=1);

namespace App\Models;

/**
 * RefreshToken
 * -----------------------------------------------------------------------------
 * Persistiert nur den SHA-256-Hash des Refresh-Tokens. Ermöglicht Rotation und
 * serverseitige Invalidierung (Logout / "alle Sitzungen beenden").
 */
final class RefreshToken extends Model
{
    public static function store(int $userId, string $token, int $ttl): void
    {
        $expires = (new \DateTimeImmutable("+$ttl seconds"))->format('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:u, :h, :e)'
        );
        $stmt->execute([':u' => $userId, ':h' => self::hash($token), ':e' => $expires]);
    }

    /** Liefert die DB-Zeile, falls Token gültig (existiert, nicht widerrufen, nicht abgelaufen). */
    public static function findValid(string $token): ?array
    {
        $stmt = self::db()->prepare(
            'SELECT * FROM refresh_tokens
             WHERE token_hash = :h AND revoked = 0 AND expires_at > NOW()'
        );
        $stmt->execute([':h' => self::hash($token)]);
        return $stmt->fetch() ?: null;
    }

    public static function revoke(string $token): void
    {
        $stmt = self::db()->prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = :h');
        $stmt->execute([':h' => self::hash($token)]);
    }

    public static function revokeAllForUser(int $userId): void
    {
        $stmt = self::db()->prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :u');
        $stmt->execute([':u' => $userId]);
    }

    private static function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
