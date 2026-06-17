<?php
declare(strict_types=1);
namespace App\Controllers;

use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Models\KlassenbuchEntry;

final class KlassenbuchController
{
    public static function index(Request $req): void
    {
        $listId = (int) ($req->query['list_id'] ?? 0);
        if (!$listId) throw HttpException::unprocessable('list_id erforderlich');
        $rows = KlassenbuchEntry::forList($listId);
        Response::json(array_map([KlassenbuchEntry::class, 'mapOut'], $rows));
    }

    public static function store(Request $req): void
    {
        if (empty($req->body['list_id'])) throw HttpException::unprocessable('list_id erforderlich');
        $row = KlassenbuchEntry::create($req->user['id'], $req->body);
        Response::json(KlassenbuchEntry::mapOut($row), 201);
    }

    public static function update(Request $req): void
    {
        $row = KlassenbuchEntry::update((int) $req->params['id'], $req->body);
        if (!$row) throw HttpException::notFound('Eintrag nicht gefunden');
        Response::json(KlassenbuchEntry::mapOut($row));
    }

    public static function destroy(Request $req): void
    {
        $ok = KlassenbuchEntry::delete((int) $req->params['id']);
        if (!$ok) throw HttpException::notFound('Eintrag nicht gefunden');
        Response::json(['ok' => true]);
    }
}
