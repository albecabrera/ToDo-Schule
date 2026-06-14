<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Config\Env;
use App\Lib\HttpException;
use App\Lib\Jwt;
use App\Lib\Request;
use App\Models\User;

/**
 * AuthMiddleware
 * -----------------------------------------------------------------------------
 * Schützt Routen: liest den Bearer-Access-Token, verifiziert ihn und hängt den
 * Nutzer an die Request an. Wird vom Router für Routen mit ['auth' => true]
 * aufgerufen.
 */
final class AuthMiddleware
{
    public static function handle(Request $request): void
    {
        $token = $request->bearerToken();
        if ($token === null) {
            throw HttpException::unauthorized('Kein Access-Token übermittelt', 'missing_token');
        }

        $payload = Jwt::decode(
            $token,
            (string) Env::get('JWT_ACCESS_SECRET'),
            'access'
        );

        $userId = (int) ($payload['sub'] ?? 0);
        $user = User::find($userId);
        if ($user === null) {
            throw HttpException::unauthorized('Nutzer existiert nicht mehr', 'invalid_token');
        }

        $request->user = $user;

        // „Zuletzt online" gedrosselt aktualisieren (für Präsenz/Last-Seen).
        User::touchLastSeen($userId);
    }
}
