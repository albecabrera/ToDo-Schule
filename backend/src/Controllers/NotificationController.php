<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Models\Notification;

final class NotificationController
{
    public static function index(Request $req): void
    {
        $notifs = Notification::allForUser($req->userId());
        Response::json(['notifications' => $notifs]);
    }

    public static function markRead(Request $req): void
    {
        Notification::markRead((int) $req->param('id'), $req->userId());
        Response::json(['ok' => true]);
    }

    public static function markAllRead(Request $req): void
    {
        Notification::markAllRead($req->userId());
        Response::json(['ok' => true]);
    }
}
