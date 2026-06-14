<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\User;

/**
 * AdminController
 * -----------------------------------------------------------------------------
 * Benutzerverwaltung für Administratoren.
 * Alle Routen benötigen ['auth' => true, 'admin' => true].
 *
 * GET    /api/admin/users           → alle Nutzer
 * POST   /api/admin/users           → Nutzer anlegen
 * PATCH  /api/admin/users/:id       → Nutzer bearbeiten (Name, E-Mail, Kürzel, Admin)
 * POST   /api/admin/users/:id/reset → Passwort zurücksetzen (temp PW generieren)
 * DELETE /api/admin/users/:id       → Nutzer löschen
 */
final class AdminController
{
    /** GET /api/admin/users */
    public static function index(Request $req): void
    {
        Response::json(['users' => User::all()]);
    }

    /** POST /api/admin/users */
    public static function store(Request $req): void
    {
        $data = Validator::make($req->body, [
            'email'        => 'required|string|email|max:255',
            'name'         => 'required|string|max:120',
            'abbreviation' => 'nullable|string|max:10',
            'password'     => 'nullable|string|min:8|max:128',
            'isAdmin'      => 'nullable|boolean',
        ]);

        if (User::emailExists($data['email'])) {
            throw new HttpException(422, 'E-Mail bereits vergeben', 'email_taken');
        }

        $password = $data['password'] ?? self::randomPassword();
        $user     = User::adminCreate(
            $data['email'],
            $password,
            $data['name'] ?? null,
            $data['abbreviation'] ?? null,
            (bool) ($data['isAdmin'] ?? false)
        );

        // Temporäres Passwort im Response zurückgeben (einmalig, nicht gespeichert).
        Response::json(['user' => $user, 'tempPassword' => $data['password'] ? null : $password], 201);
    }

    /** PATCH /api/admin/users/:id */
    public static function update(Request $req): void
    {
        $id = (int) $req->params['id'];
        self::guardSelf($req, $id, 'is_admin');   // eigenen Admin-Status nicht entziehen

        $data = Validator::make($req->body, [
            'name'         => 'nullable|string|max:120',
            'email'        => 'nullable|string|email|max:255',
            'abbreviation' => 'nullable|string|max:10',
            'isAdmin'      => 'nullable|boolean',
        ]);

        $fields = [];
        if (array_key_exists('name', $data))         $fields['name']         = $data['name'];
        if (array_key_exists('email', $data))        $fields['email']        = strtolower($data['email']);
        if (array_key_exists('abbreviation', $data)) $fields['abbreviation'] = $data['abbreviation'] ? strtolower($data['abbreviation']) : null;
        if (array_key_exists('isAdmin', $data))      $fields['is_admin']     = (int) $data['isAdmin'];

        $user = User::adminUpdate($id, $fields);
        Response::json(['user' => $user]);
    }

    /** POST /api/admin/users/:id/reset — Temporäres Passwort setzen */
    public static function resetPassword(Request $req): void
    {
        $id  = (int) $req->params['id'];
        $tmp = self::randomPassword();
        User::resetToTemporary($id, $tmp);
        Response::json(['tempPassword' => $tmp]);
    }

    /** DELETE /api/admin/users/:id */
    public static function destroy(Request $req): void
    {
        $id = (int) $req->params['id'];
        self::guardSelf($req, $id, 'delete');

        User::adminDelete($id);
        Response::json(null, 204);
    }

    // ── Hilfsmethoden ─────────────────────────────────────────────────────────

    /** Verhindert, dass ein Admin seinen eigenen Account oder Status löscht. */
    private static function guardSelf(Request $req, int $targetId, string $action): void
    {
        if ($targetId === $req->userId()) {
            $msg = $action === 'delete'
                ? 'Eigenen Account nicht über Admin-Panel löschbar (DSGVO-Route verwenden)'
                : 'Eigenen Admin-Status nicht entziehbar';
            throw new HttpException(422, $msg, 'self_guard');
        }
    }

    private static function randomPassword(): string
    {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#';
        $pw    = '';
        for ($i = 0; $i < 12; $i++) {
            $pw .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $pw;
    }
}
