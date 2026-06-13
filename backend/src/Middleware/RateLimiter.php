<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Config\Database;
use App\Config\Env;
use App\Lib\HttpException;

/**
 * RateLimiter
 * -----------------------------------------------------------------------------
 * Fixed-Window-Rate-Limiting, primär für Auth-Endpunkte. Schlüssel = IP + Route.
 * Zwei Backends (RATE_LIMIT_BACKEND):
 *   - file (Default): atomare Zählerdateien unter storage/ratelimit/
 *   - db:             Tabelle rate_limits
 *
 * Setzt X-RateLimit-* Header und wirft bei Überschreitung eine 429.
 */
final class RateLimiter
{
    public static function check(string $bucket): void
    {
        $max    = Env::int('RATE_LIMIT_AUTH_MAX', 10);
        $window = Env::int('RATE_LIMIT_AUTH_WINDOW', 60);
        $ip     = self::clientIp();
        $key    = $bucket . ':' . $ip;

        $backend = strtolower((string) Env::get('RATE_LIMIT_BACKEND', 'file'));
        [$hits, $resetIn] = $backend === 'db'
            ? self::hitDb($key, $window)
            : self::hitFile($key, $window);

        $remaining = max(0, $max - $hits);
        if (!headers_sent()) {
            header('X-RateLimit-Limit: ' . $max);
            header('X-RateLimit-Remaining: ' . $remaining);
            header('X-RateLimit-Reset: ' . $resetIn);
        }

        if ($hits > $max) {
            if (!headers_sent()) {
                header('Retry-After: ' . $resetIn);
            }
            throw HttpException::tooManyRequests(
                'Zu viele Anfragen. Bitte in ' . $resetIn . ' Sekunden erneut versuchen.'
            );
        }
    }

    /** @return array{0:int,1:int} [hits, resetInSeconds] */
    private static function hitFile(string $key, int $window): array
    {
        $dir = APP_ROOT . '/storage/ratelimit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $file = $dir . '/' . hash('sha256', $key) . '.json';
        $now  = time();

        $fp = fopen($file, 'c+');
        if ($fp === false) {
            return [0, $window]; // im Zweifel nicht blockieren
        }
        flock($fp, LOCK_EX);
        $raw  = stream_get_contents($fp) ?: '';
        $data = json_decode($raw, true) ?: ['count' => 0, 'start' => $now];

        if ($now - (int) $data['start'] >= $window) {
            $data = ['count' => 0, 'start' => $now];
        }
        $data['count']++;

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data));
        flock($fp, LOCK_UN);
        fclose($fp);

        $resetIn = $window - ($now - (int) $data['start']);
        return [(int) $data['count'], max(1, $resetIn)];
    }

    /** @return array{0:int,1:int} */
    private static function hitDb(string $key, int $window): array
    {
        $pdo = Database::connection();
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT hits, window_start FROM rate_limits WHERE bucket_key = :k FOR UPDATE');
        $stmt->execute([':k' => $key]);
        $row = $stmt->fetch();

        if (!$row || (time() - strtotime($row['window_start'])) >= $window) {
            $pdo->prepare(
                'INSERT INTO rate_limits (bucket_key, hits, window_start)
                 VALUES (:k, 1, :w)
                 ON DUPLICATE KEY UPDATE hits = 1, window_start = :w'
            )->execute([':k' => $key, ':w' => $now]);
            $hits = 1;
            $start = time();
        } else {
            $pdo->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE bucket_key = :k')
                ->execute([':k' => $key]);
            $hits = (int) $row['hits'] + 1;
            $start = strtotime($row['window_start']);
        }
        $pdo->commit();

        return [$hits, max(1, $window - (time() - $start))];
    }

    private static function clientIp(): string
    {
        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $h) {
            if (!empty($_SERVER[$h])) {
                return trim(explode(',', $_SERVER[$h])[0]);
            }
        }
        return '0.0.0.0';
    }
}
