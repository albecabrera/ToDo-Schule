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
    private const MAX_FILE_BYTES = 50 * 1024 * 1024;
    private const FILES_DIR      = __DIR__ . '/../../public/chat-files/';

    /** GET /api/chat?to={userId}  (omit ?to for group chat) */
    public static function index(Request $req): void
    {
        $to   = isset($req->query['to']) && $req->query['to'] !== '' ? (int) $req->query['to'] : null;
        $msgs = ChatMessage::recent(100, $req->userId(), $to);
        Response::json(['messages' => $msgs]);
    }

    /** POST /api/chat/upload  multipart: file */
    public static function uploadFile(Request $req): void
    {
        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $code = $_FILES['file']['error'] ?? -1;
            throw new HttpException(400, "Upload-Fehler (code $code).");
        }
        $file = $_FILES['file'];
        if ((int) $file['size'] > self::MAX_FILE_BYTES) {
            throw new HttpException(413, 'Datei zu groß (max. 50 MB).');
        }

        $dir = self::FILES_DIR;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $origName = basename($file['name']);
        $ext      = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $safeName = uniqid('cf_', true) . ($ext !== '' ? ".$ext" : '');
        $dest     = $dir . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new HttpException(500, 'Datei konnte nicht gespeichert werden.');
        }

        Response::json([
            'url'  => '/chat-files/' . $safeName,
            'name' => $origName,
        ], 201);
    }

    /** POST /api/chat  body: { content, to?, attachment_url?, attachment_name? } */
    public static function store(Request $req): void
    {
        $data = Validator::make($req->body, [
            'content'         => 'nullable|string|max:2000',
            'to'              => 'nullable|int',
            'attachment_url'  => 'nullable|string|max:500',
            'attachment_name' => 'nullable|string|max:255',
        ]);

        $content        = trim((string) ($data['content'] ?? ''));
        $attachmentUrl  = $data['attachment_url'] ?? null;
        $attachmentName = $data['attachment_name'] ?? null;

        if ($content === '' && $attachmentUrl === null) {
            throw new HttpException(422, 'Nachricht oder Datei erforderlich.');
        }

        $recipientId = isset($data['to']) && $data['to'] !== null ? (int) $data['to'] : null;
        $message     = ChatMessage::create($req->userId(), $content, $recipientId, $attachmentUrl, $attachmentName);

        if ($recipientId !== null) {
            // DM: push to both parties' personal rooms
            Emitter::emit('user:' . $req->userId(), 'chat:message', ['message' => $message]);
            Emitter::emit('user:' . $recipientId,   'chat:message', ['message' => $message]);
        } else {
            // Kollegiumschat: broadcast to everyone
            Emitter::emit('broadcast', 'chat:message', ['message' => $message]);
        }

        Response::json(['message' => $message], 201);
    }
}
