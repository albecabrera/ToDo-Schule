<?php
declare(strict_types=1);
namespace App\Controllers;

use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Models\Elternkontakt;

final class ElternkontaktController
{
    public static function index(Request $req): void
    {
        $listId      = (int) ($req->query['list_id'] ?? 0);
        $studentName = $req->query['student'] ?? '';
        if (!$listId || !$studentName) throw HttpException::unprocessable('list_id und student erforderlich');
        $rows = Elternkontakt::forStudent($listId, $studentName);
        Response::json(array_map([Elternkontakt::class, 'mapOut'], $rows));
    }

    public static function store(Request $req): void
    {
        if (empty($req->body['list_id']) || empty($req->body['student_name']) || empty($req->body['contact_date'])) {
            throw HttpException::unprocessable('list_id, student_name und contact_date erforderlich');
        }
        $row = Elternkontakt::create($req->user['id'], $req->body);
        Response::json(Elternkontakt::mapOut($row), 201);
    }

    public static function destroy(Request $req): void
    {
        $ok = Elternkontakt::delete((int) $req->params['id'], (int) $req->user['id']);
        if (!$ok) throw HttpException::notFound('Eintrag nicht gefunden');
        Response::json(['ok' => true]);
    }
}
