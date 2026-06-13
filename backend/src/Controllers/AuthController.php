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

    /**
     * Passwort-Selbstzurücksetzung ohne Mailserver:
     * Kürzel + Schul-E-Mail müssen zum selben Konto gehören. Das Passwort wird
     * dann auf den Nachnamen zurückgesetzt (= Erstpasswort) und ein erzwungener
     * Wechsel beim nächsten Login aktiviert.
     */
    public static function resetPassword(Request $req): void
    {
        $data = Validator::make($req->body, [
            'abbreviation' => 'required|string|max:8',
            'email'        => 'required|email|max:255',
        ]);

        $user = User::findByAbbreviation(trim($data['abbreviation']));

        // Bewusst generische Antwort, falls Kürzel oder E-Mail nicht passen
        // (keine Auskunft, ob ein Konto existiert).
        if ($user === null
            || strcasecmp((string) ($user['email'] ?? ''), trim($data['email'])) !== 0) {
            throw HttpException::unprocessable(
                'Kürzel und E-Mail passen zu keinem Konto.',
                [],
                'reset_no_match'
            );
        }

        // Nachname = letztes Wort des Namens (wie beim Seed des Erstpassworts).
        $parts    = preg_split('/\s+/', trim((string) ($user['name'] ?? '')));
        $lastName = $parts ? end($parts) : '';
        if ($lastName === '') {
            throw HttpException::unprocessable('Konto hat keinen Namen hinterlegt.', [], 'reset_no_name');
        }

        User::resetToTemporary((int) $user['id'], $lastName);

        Response::json([
            'success' => true,
            'message' => 'Passwort wurde auf deinen Nachnamen zurückgesetzt. '
                . 'Melde dich damit an und wähle anschließend ein neues Passwort.',
        ]);
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
