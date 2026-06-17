<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Models\Klasse;

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
        Response::json($out);
    }

    public static function destroy(Request $req): void
    {
        $id = (int) $req->params['id'];
        $ok = Klasse::delete($id);
        if (!$ok) throw HttpException::notFound('Liste nicht gefunden');
        Emitter::emit('broadcast', 'klasseliste:updated', ['id' => $id, 'action' => 'deleted']);
        Response::json(['ok' => true]);
    }
}
