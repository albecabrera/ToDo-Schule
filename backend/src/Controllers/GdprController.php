<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\User;

/**
 * GdprController (DSGVO)
 * -----------------------------------------------------------------------------
 * Datenschutz: Export aller eigenen Daten und Konto-Löschung.
 *
 * GET  /api/users/me/export  → JSON mit allen Nutzerdaten
 * DELETE /api/users/me       → Konto löschen (Passwort-Bestätigung erforderlich)
 */
final class GdprController
{
    /** Exportiert alle Nutzerdaten als JSON. */
    public static function export(Request $req): void
    {
        $userId = $req->userId();
        $pdo    = \App\Models\Model::db();

        // Profil
        $profile = User::find($userId);
        unset($profile['password_hash'], $profile['ics_token']);

        // Aufgaben (eigene + zugewiesene)
        $tasks = $pdo->prepare(
            'SELECT t.* FROM tasks t
             LEFT JOIN task_assignees ta ON ta.task_id = t.id
             WHERE t.created_by = :u1 OR ta.user_id = :u2
             GROUP BY t.id ORDER BY t.created_at'
        );
        $tasks->execute([':u1' => $userId, ':u2' => $userId]);

        // Notizen
        $notes = $pdo->prepare('SELECT * FROM notes WHERE created_by = :u ORDER BY created_at');
        $notes->execute([':u' => $userId]);

        // Kommentare
        $comments = $pdo->prepare('SELECT * FROM comments WHERE user_id = :u ORDER BY created_at');
        $comments->execute([':u' => $userId]);

        // Chat-Nachrichten
        $chat = $pdo->prepare('SELECT * FROM chat_messages WHERE user_id = :u ORDER BY created_at');
        $chat->execute([':u' => $userId]);

        // Anhänge
        $attachments = $pdo->prepare('SELECT * FROM attachments WHERE uploaded_by = :u ORDER BY created_at');
        $attachments->execute([':u' => $userId]);

        Response::json([
            'exported_at'  => date('c'),
            'profile'      => $profile,
            'tasks'        => $tasks->fetchAll(),
            'notes'        => $notes->fetchAll(),
            'comments'     => $comments->fetchAll(),
            'chat_messages'=> $chat->fetchAll(),
            'attachments'  => $attachments->fetchAll(),
        ]);
    }

    /** Löscht das eigene Konto nach Passwort-Bestätigung. */
    public static function deleteMe(Request $req): void
    {
        $data = Validator::make($req->body, [
            'password' => 'required|string',
        ]);

        $userId = $req->userId();
        $user   = $pdo = \App\Models\Model::db()->prepare('SELECT * FROM users WHERE id = :id');
        $user->execute([':id' => $userId]);
        $row = $user->fetch();

        if (!$row || !password_verify($data['password'], $row['password_hash'])) {
            Response::error('Falsches Passwort', 403);
            return;
        }

        $db = \App\Models\Model::db();

        // Anhänge von Disk löschen
        $attStmt = $db->prepare('SELECT filename FROM attachments WHERE uploaded_by = :u');
        $attStmt->execute([':u' => $userId]);
        $storageDir = dirname(__DIR__, 2) . '/storage/attachments/';
        foreach ($attStmt->fetchAll() as $att) {
            @unlink($storageDir . $att['filename']);
        }

        // Avatar löschen
        if ($row['avatar_url']) {
            $avatarFile = dirname(__DIR__, 2) . '/storage/avatars/' . basename($row['avatar_url']);
            @unlink($avatarFile);
        }

        // Kaskade: SQLite foreign keys + manuell
        $db->exec('PRAGMA foreign_keys = ON');
        $db->prepare('DELETE FROM task_assignees   WHERE user_id  = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM team_members     WHERE user_id  = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM comments         WHERE user_id  = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM chat_messages    WHERE user_id  = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM attachments      WHERE uploaded_by = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM notifications    WHERE user_id  = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM push_subscriptions WHERE user_id = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM notes            WHERE created_by = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM tasks            WHERE created_by = :u')->execute([':u' => $userId]);
        $db->prepare('DELETE FROM users            WHERE id = :u')->execute([':u' => $userId]);

        Response::json(['deleted' => true]);
    }
}
