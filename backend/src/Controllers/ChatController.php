<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\ChatMessage;

final class ChatController
{
    public static function index(Request $req): void
    {
        $messages = ChatMessage::recent(60);
        Response::json(['messages' => $messages]);
    }

    public static function store(Request $req): void
    {
        $data = Validator::make($req->body, [
            'content' => 'required|string|max:2000',
        ]);

        $message = ChatMessage::create($req->userId(), trim($data['content']));

        Emitter::emit('broadcast', 'chat:message', ['message' => $message]);

        Response::json(['message' => $message], 201);
    }
}
