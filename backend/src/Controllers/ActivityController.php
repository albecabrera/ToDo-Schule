<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Models\AuditLog;

/**
 * ActivityController
 * -----------------------------------------------------------------------------
 * GET /api/activity — globaler Aktivitäts-Feed für den angemeldeten Nutzer.
 *
 * Query-Parameter (alle optional):
 *   team_id  — nur Einträge für diesen Bereich
 *   user_id  — nur Einträge von diesem Nutzer
 *   action   — z. B. "task.created", "task.updated", "task.done"
 *   limit    — max. Einträge (1–100, Standard 50)
 */
final class ActivityController
{
    public static function index(Request $req): void
    {
        $userId  = $req->userId();
        $filters = array_intersect_key($req->query, array_flip(['team_id', 'user_id', 'action', 'limit']));

        $entries = AuditLog::feed($userId, $filters);

        Response::json(['activity' => $entries]);
    }
}
