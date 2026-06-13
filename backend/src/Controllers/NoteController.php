<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\Note;
use App\Models\Team;

/**
 * NoteController
 * -----------------------------------------------------------------------------
 * CRUD für Notizen & Planungen. Notizen mit team_id sind für alle
 * Teammitglieder sichtbar und werden in Echtzeit synchronisiert.
 */
final class NoteController
{
    public static function index(Request $req): void
    {
        $filters = [
            'kind'   => $req->query['kind']   ?? null,
            'teamId' => $req->query['teamId'] ?? null,
        ];
        Response::json(['notes' => Note::allForUser($req->userId(), $filters)]);
    }

    public static function show(Request $req): void
    {
        $note = self::load((int) $req->param('id'));
        self::assertView($note, $req->userId());
        Response::json(['note' => $note]);
    }

    public static function store(Request $req): void
    {
        $data = Validator::make($req->body, [
            'title'   => 'required|string|max:255',
            'content' => 'nullable|string|max:65000',
            'kind'    => 'nullable|in:note,plan',
            'teamId'  => 'nullable|int',
        ]);

        if (!empty($data['teamId']) && !Team::isMember((int) $data['teamId'], $req->userId())) {
            throw HttpException::forbidden('Du bist kein Mitglied dieses Teams', 'not_team_member');
        }

        $note = Note::create($data, $req->userId());
        Emitter::emitMany(self::channels($note), 'note:created', ['note' => $note]);

        Response::json(['note' => $note], 201);
    }

    public static function update(Request $req): void
    {
        $note = self::load((int) $req->param('id'));
        self::assertView($note, $req->userId());

        $data = Validator::make($req->body, [
            'title'   => 'nullable|string|max:255',
            'content' => 'nullable|string|max:65000',
            'kind'    => 'nullable|in:note,plan',
            'teamId'  => 'nullable|int',
        ]);

        if (!empty($data['teamId']) && !Team::isMember((int) $data['teamId'], $req->userId())) {
            throw HttpException::forbidden('Du bist kein Mitglied dieses Teams', 'not_team_member');
        }

        $oldChannels = self::channels($note);
        $updated = Note::update((int) $note['id'], $data);

        // Altes UND neues Team informieren (falls die Notiz umgezogen ist).
        Emitter::emitMany(
            array_unique(array_merge($oldChannels, self::channels($updated))),
            'note:updated',
            ['note' => $updated]
        );

        Response::json(['note' => $updated]);
    }

    public static function destroy(Request $req): void
    {
        $note = self::load((int) $req->param('id'));

        // Löschen darf nur der Verfasser.
        if ((int) $note['created_by'] !== $req->userId()) {
            throw HttpException::forbidden('Nur der Verfasser darf diese Notiz löschen', 'not_owner');
        }

        $channels = self::channels($note);
        Note::delete((int) $note['id']);
        Emitter::emitMany($channels, 'note:deleted', ['noteId' => (int) $note['id']]);

        Response::noContent();
    }

    // --- Helfer ---------------------------------------------------------------

    private static function load(int $id): array
    {
        $note = Note::find($id);
        if ($note === null) {
            throw HttpException::notFound('Notiz nicht gefunden', 'note_not_found');
        }
        return $note;
    }

    /** Sehen/Bearbeiten: Verfasser oder Teammitglied. */
    private static function assertView(array $note, int $userId): void
    {
        if ((int) $note['created_by'] === $userId) {
            return;
        }
        if (!empty($note['team_id']) && Team::isMember((int) $note['team_id'], $userId)) {
            return;
        }
        throw HttpException::forbidden('Kein Zugriff auf diese Notiz', 'note_forbidden');
    }

    private static function channels(array $note): array
    {
        $channels = [Emitter::user((int) $note['created_by'])];
        if (!empty($note['team_id'])) {
            $channels[] = Emitter::team((int) $note['team_id']);
        }
        return $channels;
    }
}
