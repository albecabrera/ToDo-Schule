<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use PDOException;

/**
 * Database
 * -----------------------------------------------------------------------------
 * Liefert eine geteilte PDO-Instanz (Singleton).
 *  - Connection Pooling über persistente Verbindungen (PDO::ATTR_PERSISTENT).
 *  - Reconnect-Logik: bei "MySQL has gone away" wird transparent neu verbunden.
 *  - Exceptions statt stiller Fehler, FETCH_ASSOC als Default.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }
        return self::$pdo = self::connect();
    }

    private static function connect(): PDO
    {
        $driver   = Env::get('DB_DRIVER', 'mysql');
        $host     = Env::get('DB_HOST', '127.0.0.1');
        $port     = Env::int('DB_PORT', 3306);
        $database = Env::get('DB_DATABASE', 'todo_schule');
        $user     = Env::get('DB_USERNAME', 'root');
        $pass     = (string) Env::get('DB_PASSWORD', '');

        $dsn = sprintf('%s:host=%s;port=%d;dbname=%s;charset=utf8mb4', $driver, $host, $port, $database);

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_PERSISTENT         => Env::bool('DB_PERSISTENT', true),
        ];

        $attempts = 0;
        do {
            try {
                return new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                if (++$attempts >= 3) {
                    throw $e;
                }
                // Kurzer Backoff vor dem nächsten Versuch (Reconnect-Logik).
                usleep(250_000 * $attempts);
            }
        } while (true);
    }

    /**
     * Führt einen Callback aus und verbindet bei Verbindungsverlust einmalig neu.
     * Nützlich für langlebige CLI-Prozesse (WebSocket-Server).
     */
    public static function withReconnect(callable $fn): mixed
    {
        try {
            return $fn(self::connection());
        } catch (PDOException $e) {
            if (self::isConnectionLost($e)) {
                self::$pdo = null;
                return $fn(self::connection());
            }
            throw $e;
        }
    }

    private static function isConnectionLost(PDOException $e): bool
    {
        $code = $e->errorInfo[1] ?? null;
        // 2006 = server gone away, 2013 = lost connection during query
        return in_array($code, [2006, 2013], true)
            || str_contains($e->getMessage(), 'gone away');
    }

    /** Verbindung schließen (für Tests / Reconnect). */
    public static function reset(): void
    {
        self::$pdo = null;
    }
}
