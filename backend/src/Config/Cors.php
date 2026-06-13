<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Cors
 * -----------------------------------------------------------------------------
 * Setzt CORS-Header für die PWA-Origin (aus ALLOWED_ORIGIN). Beantwortet
 * Preflight-Requests (OPTIONS) direkt mit 204.
 */
final class Cors
{
    public static function apply(): void
    {
        $allowed = array_map('trim', explode(',', (string) Env::get('ALLOWED_ORIGIN', '*')));
        $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array('*', $allowed, true)) {
            header('Access-Control-Allow-Origin: *');
        } elseif ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
