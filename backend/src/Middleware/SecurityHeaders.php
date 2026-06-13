<?php

declare(strict_types=1);

namespace App\Middleware;

/**
 * SecurityHeaders
 * -----------------------------------------------------------------------------
 * Helmet.js-Äquivalent für PHP: setzt eine sinnvolle Auswahl an Security-Headern
 * für eine JSON-API.
 */
final class SecurityHeaders
{
    public static function apply(): void
    {
        if (headers_sent()) {
            return;
        }
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header('Cross-Origin-Resource-Policy: same-site');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
        header_remove('X-Powered-By');
        // HSTS nur über HTTPS sinnvoll:
        if (($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['SERVER_PORT'] ?? '') === '443') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }
}
