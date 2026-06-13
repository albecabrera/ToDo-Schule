<?php

declare(strict_types=1);

namespace App\Lib;

use App\Config\Database;

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
