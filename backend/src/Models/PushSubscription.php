<?php

declare(strict_types=1);

namespace App\Models;

final class PushSubscription extends Model
{
    /** Speichert (oder aktualisiert) eine Subscription für einen Nutzer. */
    public static function store(int $userId, string $endpoint, string $p256dh, string $auth): void
    {
        // Endpoint ist eindeutig: bei Konflikt Besitzer/Schlüssel aktualisieren.
        self::db()->prepare(
            'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES (:u, :e, :p, :a)
             ON CONFLICT(endpoint) DO UPDATE SET
                user_id = excluded.user_id,
                p256dh  = excluded.p256dh,
                auth    = excluded.auth'
        )->execute([':u' => $userId, ':e' => $endpoint, ':p' => $p256dh, ':a' => $auth]);
    }

    public static function deleteByEndpoint(string $endpoint): void
    {
        self::db()->prepare('DELETE FROM push_subscriptions WHERE endpoint = :e')
            ->execute([':e' => $endpoint]);
    }

    /** @return list<array{id:int,endpoint:string}> */
    public static function forUser(int $userId): array
    {
        $stmt = self::db()->prepare(
            'SELECT id, endpoint FROM push_subscriptions WHERE user_id = :u'
        );
        $stmt->execute([':u' => $userId]);
        return $stmt->fetchAll();
    }
}
