<?php

declare(strict_types=1);

namespace App\Lib;

use App\Config\Database;
use App\Models\PushSubscription;

/**
 * Emitter
 * -----------------------------------------------------------------------------
 * Brücke zwischen REST (PHP-FPM/Apache) und dem WebSocket-Server (CLI-Prozess).
 *
 * Da beide in getrennten Prozessen laufen, schreiben die REST-Controller ihre
 * Echtzeit-Ereignisse in die `events`-Tabelle. Der WebSocket-Server pollt diese
 * Tabelle und broadcastet neue Zeilen an die passenden Rooms.
 *
 * Channels:
 *   user:<id>   -> persönlicher Room eines Nutzers
 *   team:<id>   -> Team-Room
 */
final class Emitter
{
    /**
     * @param string $channel z. B. 'user:5' oder 'team:2'
     * @param string $event   z. B. 'task:created'
     * @param array  $payload beliebige JSON-Nutzdaten
     */
    /** Events, die einen Web-Push an einen einzelnen Nutzer auslösen. */
    private const PUSH_EVENTS = ['user:assigned', 'comment:added', 'chat:message', 'note:created'];

    public static function emit(string $channel, string $event, array $payload): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'INSERT INTO events (channel, event, payload) VALUES (:c, :e, :p)'
        );
        $stmt->execute([
            ':c' => $channel,
            ':e' => $event,
            ':p' => json_encode($payload, JSON_UNESCAPED_UNICODE),
        ]);

        self::maybePush($channel, $event);
    }

    /**
     * Best-effort Web-Push an einen einzelnen Nutzer (nur user:<id>-Channels).
     * Fehler werden bewusst verschluckt — Push darf den REST-Request nie stören.
     */
    private static function maybePush(string $channel, string $event): void
    {
        if (!str_starts_with($channel, 'user:') || !in_array($event, self::PUSH_EVENTS, true)) {
            return;
        }
        if (!WebPush::isConfigured()) {
            return;
        }
        try {
            $userId = (int) substr($channel, 5);
            foreach (PushSubscription::forUser($userId) as $sub) {
                $status = WebPush::send($sub['endpoint']);
                if ($status === 404 || $status === 410) {
                    PushSubscription::deleteByEndpoint($sub['endpoint']);
                }
            }
        } catch (\Throwable) {
            // ignorieren
        }
    }

    /** Sendet dasselbe Event an mehrere Channels (dedupliziert). */
    public static function emitMany(array $channels, string $event, array $payload): void
    {
        foreach (array_unique($channels) as $channel) {
            self::emit($channel, $event, $payload);
        }
    }

    public static function user(int $userId): string
    {
        return 'user:' . $userId;
    }

    public static function team(int $teamId): string
    {
        return 'team:' . $teamId;
    }
}
