<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\User;

/**
 * UserController
 * -----------------------------------------------------------------------------
 * Eigenes Profil abrufen und aktualisieren.
 */
final class UserController
{
    public static function me(Request $req): void
    {
        Response::json(['user' => $req->user]);
    }

    /** GET /api/users — Kollegen (gemeinsame Teams) inkl. eigenem Eintrag. */
    public static function colleagues(Request $req): void
    {
        $users = User::colleagues($req->userId());
        Response::json(['users' => $users]);
    }

    public static function updateMe(Request $req): void
    {
        $data = Validator::make($req->body, [
            'name'      => 'nullable|string|max:120',
            'avatarUrl' => 'nullable|string|max:512',
            'password'  => 'nullable|string|min:8|max:128',
        ]);

        $update = [];
        if (array_key_exists('name', $data)) {
            $update['name'] = $data['name'];
        }
        if (array_key_exists('avatarUrl', $data)) {
            $update['avatar_url'] = $data['avatarUrl'];
        }

        // Passwortwechsel (hebt den Erstpasswort-Zwang auf).
        if (!empty($data['password'])) {
            User::updatePassword($req->userId(), $data['password']);
        }

        $user = User::update($req->userId(), $update);
        Response::json(['user' => $user]);
    }
}
