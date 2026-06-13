<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Lib\WebPush;
use App\Models\PushSubscription;

final class PushController
{
    /** GET /api/push/public-key — VAPID-Public-Key fürs Frontend (applicationServerKey). */
    public static function publicKey(Request $req): void
    {
        Response::json([
            'publicKey' => WebPush::publicKey(),
            'enabled'   => WebPush::isConfigured(),
        ]);
    }

    /** POST /api/push/subscribe  body: { endpoint, keys:{p256dh, auth} } */
    public static function subscribe(Request $req): void
    {
        $data = Validator::make($req->body, [
            'endpoint' => 'required|string|max:1000',
        ]);
        $keys   = $req->body['keys'] ?? [];
        $p256dh = is_array($keys) ? (string) ($keys['p256dh'] ?? '') : '';
        $auth   = is_array($keys) ? (string) ($keys['auth'] ?? '') : '';

        PushSubscription::store($req->userId(), $data['endpoint'], $p256dh, $auth);
        Response::json(['success' => true], 201);
    }

    /** POST /api/push/unsubscribe  body: { endpoint } */
    public static function unsubscribe(Request $req): void
    {
        $data = Validator::make($req->body, ['endpoint' => 'required|string|max:1000']);
        PushSubscription::deleteByEndpoint($data['endpoint']);
        Response::noContent();
    }
}
