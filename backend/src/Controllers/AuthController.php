<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\Env;
use App\Lib\HttpException;
use App\Lib\Jwt;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\RefreshToken;
use App\Models\User;

/**
 * AuthController
 * -----------------------------------------------------------------------------
 * Registrierung, Login, Token-Refresh (mit Rotation) und Logout.
 */
final class AuthController
{
    public static function register(Request $req): void
    {
        $data = Validator::make($req->body, [
            'email'    => 'required|email|max:255',
            'password' => 'required|string|min:8|max:128',
            'name'     => 'nullable|string|max:120',
        ]);

        if (User::emailExists($data['email'])) {
            throw HttpException::conflict('E-Mail ist bereits registriert', 'email_taken');
        }

        $user   = User::create($data['email'], $data['password'], $data['name'] ?? null);
        $tokens = self::issueTokens($user);

        Response::json(['user' => $user, ...$tokens], 201);
    }

    /**
     * Login per Lehrerkürzel ('ca' für Cabrera) ODER E-Mail.
     * Erstpasswort nach dem Seed ist der eigene Nachname; danach signalisiert
     * must_change_password=1 dem Frontend, den Passwortwechsel einzufordern.
     */
    public static function login(Request $req): void
    {
        $data = Validator::make($req->body, [
            'email'        => 'nullable|email',
            'abbreviation' => 'nullable|string|max:8',
            'password'     => 'required|string',
        ]);

        if (empty($data['email']) && empty($data['abbreviation'])) {
            throw HttpException::unprocessable('Kürzel oder E-Mail erforderlich', [], 'missing_identifier');
        }

        $user = !empty($data['abbreviation'])
            ? User::findByAbbreviation($data['abbreviation'])
            : User::findByEmail($data['email']);

        if ($user === null || !User::verifyPassword($user, $data['password'])) {
            // Bewusst generische Meldung (keine Auskunft, ob das Konto existiert).
            throw HttpException::unauthorized('Kürzel/E-Mail oder Passwort ist falsch', 'invalid_credentials');
        }

        unset($user['password_hash']);
        $tokens = self::issueTokens($user);
        Response::json(['user' => $user, ...$tokens]);
    }

    public static function refresh(Request $req): void
    {
        $data = Validator::make($req->body, ['refreshToken' => 'required|string']);
        $token = $data['refreshToken'];

        // 1) Signatur/Ablauf prüfen.
        $payload = Jwt::decode($token, (string) Env::get('JWT_REFRESH_SECRET'), 'refresh');

        // 2) In DB vorhanden & nicht widerrufen?
        $stored = RefreshToken::findValid($token);
        if ($stored === null) {
            throw HttpException::unauthorized('Refresh-Token ungültig oder widerrufen', 'invalid_refresh');
        }

        $user = User::find((int) $payload['sub']);
        if ($user === null) {
            throw HttpException::unauthorized('Nutzer nicht gefunden', 'invalid_refresh');
        }

        // 3) Rotation: altes Token widerrufen, neues Paar ausgeben.
        RefreshToken::revoke($token);
        $tokens = self::issueTokens($user);

        Response::json($tokens);
    }

    public static function logout(Request $req): void
    {
        $token = $req->input('refreshToken');
        if (is_string($token) && $token !== '') {
            RefreshToken::revoke($token);
        }
        Response::json(['success' => true]);
    }

    /**
     * Erzeugt ein Access-/Refresh-Token-Paar und persistiert den Refresh-Hash.
     * @return array{accessToken:string,refreshToken:string,expiresIn:int}
     */
    private static function issueTokens(array $user): array
    {
        $accessTtl  = Env::int('JWT_ACCESS_TTL', 900);
        $refreshTtl = Env::int('JWT_REFRESH_TTL', 1209600);
        $issuer     = (string) Env::get('JWT_ISSUER', 'todo-schule');

        $claims = ['sub' => (int) $user['id'], 'email' => $user['email']];

        $access  = Jwt::encode($claims, (string) Env::get('JWT_ACCESS_SECRET'), $accessTtl, 'access', $issuer);
        $refresh = Jwt::encode($claims, (string) Env::get('JWT_REFRESH_SECRET'), $refreshTtl, 'refresh', $issuer);

        RefreshToken::store((int) $user['id'], $refresh, $refreshTtl);

        return [
            'accessToken'  => $access,
            'refreshToken' => $refresh,
            'expiresIn'    => $accessTtl,
        ];
    }
}
