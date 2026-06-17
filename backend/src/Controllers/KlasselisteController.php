<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\WebPush;
use App\Models\Klasse;
use App\Models\PushSubscription;
use App\Models\User;

final class KlasselisteController
{
    public static function index(Request $req): void
    {
        $rows = Klasse::all();
        Response::json(array_map([Klasse::class, 'mapOut'], $rows));
    }

    public static function store(Request $req): void
    {
        if (empty($req->body['name'])) {
            throw HttpException::unprocessable('Name fehlt', [], 'missing_name');
        }
        $row = Klasse::create($req->user['id'], $req->body);
        $out = Klasse::mapOut($row);
        Emitter::emit('broadcast', 'klasseliste:updated', ['list' => $out, 'action' => 'created']);
        self::pushToOthers($req->user['id'], 'klasseliste:updated', ['action' => 'created', 'name' => $out['name']]);
        Response::json($out, 201);
    }

    public static function show(Request $req): void
    {
        $row = Klasse::find((int) $req->params['id']);
        if (!$row) throw HttpException::notFound('Liste nicht gefunden');
        Response::json(Klasse::mapOut($row));
    }

    public static function update(Request $req): void
    {
        $row = Klasse::update((int) $req->params['id'], $req->body);
        if (!$row) throw HttpException::notFound('Liste nicht gefunden');
        $out = Klasse::mapOut($row);
        Emitter::emit('broadcast', 'klasseliste:updated', ['list' => $out, 'action' => 'updated']);
        self::pushToOthers($req->user['id'], 'klasseliste:updated', ['action' => 'updated', 'name' => $out['name']]);
        Response::json($out);
    }

    public static function destroy(Request $req): void
    {
        $id = (int) $req->params['id'];
        $ok = Klasse::delete($id);
        if (!$ok) throw HttpException::notFound('Liste nicht gefunden');
        Emitter::emit('broadcast', 'klasseliste:updated', ['id' => $id, 'action' => 'deleted']);
        self::pushToOthers($req->user['id'], 'klasseliste:updated', ['action' => 'deleted']);
        Response::json(['ok' => true]);
    }

    public static function presence(Request $req): void
    {
        $u = $req->user;
        Emitter::emit('broadcast', 'klasseliste:presence', [
            'userId' => (int) $u['id'],
            'name'   => $u['name'] ?? '',
        ]);
        Response::json(['ok' => true]);
    }

    private static function pushToOthers(int $senderId, string $event, array $payload): void
    {
        if (!WebPush::isConfigured()) return;
        try {
            foreach (User::all() as $u) {
                if ((int) $u['id'] !== $senderId) {
                    Emitter::emit('user:' . $u['id'], $event, $payload);
                }
            }
        } catch (\Throwable) {}
    }
}
