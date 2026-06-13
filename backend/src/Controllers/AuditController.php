<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Policy;
use App\Lib\Request;
use App\Lib\Response;
use App\Models\AuditLog;

/**
 * AuditController
 * -----------------------------------------------------------------------------
 * Liefert den Audit-Trail einer Aufgabe (nur für Berechtigte sichtbar).
 */
final class AuditController
{
    public static function index(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertView($task, $req->userId());

        Response::json(['audit' => AuditLog::forTask((int) $task['id'])]);
    }
}
