<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\Team;

/**
 * TeamController
 * -----------------------------------------------------------------------------
 * Teams erstellen, Details abrufen und Mitglieder per E-Mail einladen.
 */
final class TeamController
{
    /** GET /api/teams — alle Teams des eingeloggten Nutzers. */
    public static function index(Request $req): void
    {
        $teams = Team::allForUser($req->userId());
        Response::json(['teams' => $teams]);
    }

    public static function store(Request $req): void
    {
        $data  = Validator::make($req->body, [
            'name'  => 'required|string|min:2|max:160',
            'color' => 'nullable|string|max:16',
            'icon'  => 'nullable|string|max:8',
        ]);
        $team = Team::create(
            $data['name'],
            $req->userId(),
            $data['color'] ?? '#6178FE',
            $data['icon']  ?? '📁'
        );
        Response::json(['team' => $team], 201);
    }

    public static function show(Request $req): void
    {
        $teamId = (int) $req->param('id');
        $team = Team::find($teamId);
        if ($team === null) {
            throw HttpException::notFound('Team nicht gefunden', 'team_not_found');
        }
        if (!Team::isMember($teamId, $req->userId())) {
            throw HttpException::forbidden('Kein Zugriff auf dieses Team', 'team_forbidden');
        }
        Response::json(['team' => $team]);
    }

    /** Umbenennen / Farbe / Icon — nur der Eigentümer. */
    public static function update(Request $req): void
    {
        $team = self::loadOwned($req);
        $data = Validator::make($req->body, [
            'name'  => 'nullable|string|min:2|max:160',
            'color' => 'nullable|string|max:16',
            'icon'  => 'nullable|string|max:8',
        ]);
        $updated = Team::update((int) $team['id'], array_filter($data, fn($v) => $v !== null));

        Emitter::emit(Emitter::team((int) $team['id']), 'team:updated', ['team' => $updated]);
        Response::json(['team' => $updated]);
    }

    /** Löschen — nur der Eigentümer. Aufgaben/Notizen bleiben (team_id=NULL). */
    public static function destroy(Request $req): void
    {
        $team = self::loadOwned($req);
        $teamId = (int) $team['id'];

        Emitter::emit(Emitter::team($teamId), 'team:deleted', ['teamId' => $teamId]);
        Team::delete($teamId);

        Response::noContent();
    }

    private static function loadOwned(Request $req): array
    {
        $team = Team::find((int) $req->param('id'));
        if ($team === null) {
            throw HttpException::notFound('Team nicht gefunden', 'team_not_found');
        }
        if ((int) $team['owner_id'] !== $req->userId()) {
            throw HttpException::forbidden('Nur der Eigentümer darf das', 'not_owner');
        }
        return $team;
    }

    public static function invite(Request $req): void
    {
        $teamId = (int) $req->param('id');
        $team = Team::find($teamId);
        if ($team === null) {
            throw HttpException::notFound('Team nicht gefunden', 'team_not_found');
        }
        if (!Team::isMember($teamId, $req->userId())) {
            throw HttpException::forbidden('Nur Mitglieder dürfen einladen', 'team_forbidden');
        }

        $data = Validator::make($req->body, [
            'email'     => 'required|email',
            'expiresAt' => 'nullable|date',
        ]);
        $expiresAt = !empty($data['expiresAt']) ? date('Y-m-d H:i:s', strtotime($data['expiresAt'])) : null;

        $invite = Team::createInvite($teamId, $data['email'], $req->userId(), $expiresAt);

        // Falls der Eingeladene bereits existiert und sofort Mitglied wurde,
        // ihm per Echtzeit Bescheid geben + aktualisierte Mitgliederliste senden.
        if ($invite['matched']) {
            Emitter::emit(Emitter::team($teamId), 'team:member_added', [
                'teamId'  => $teamId,
                'members' => Team::members($teamId),
            ]);
        }

        Response::json([
            'invite' => [
                'email'   => $invite['email'],
                'token'   => $invite['token'],
                'teamId'  => $teamId,
                'matched' => $invite['matched'],
            ],
        ], 201);
    }
}
