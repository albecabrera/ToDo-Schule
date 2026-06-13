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

        self::fanOut($message, $recipientId, $req->userId(), 'chat:message');

        Response::json(['message' => $message], 201);
    }

    /** PUT /api/chat/:id  body: { content } — only the author may edit */
    public static function update(Request $req): void
    {
        $msg = ChatMessage::find((int) $req->param('id'));
        if ($msg === null) {
            throw new HttpException(404, 'Nachricht nicht gefunden.');
        }
        if ((int) $msg['user_id'] !== $req->userId()) {
            throw new HttpException(403, 'Nur eigene Nachrichten dürfen bearbeitet werden.');
        }

        $data    = Validator::make($req->body, ['content' => 'required|string|max:2000']);
        $content = trim($data['content']);
        if ($content === '') {
            throw new HttpException(422, 'Nachricht darf nicht leer sein.');
        }

        $message     = ChatMessage::updateContent((int) $msg['id'], $content);
        $recipientId = $msg['recipient_id'] !== null ? (int) $msg['recipient_id'] : null;
        self::fanOut($message, $recipientId, (int) $msg['user_id'], 'chat:updated');

        Response::json(['message' => $message]);
    }

    /** DELETE /api/chat/:id — only the author may delete */
    public static function destroy(Request $req): void
    {
        $msg = ChatMessage::find((int) $req->param('id'));
        if ($msg === null) {
            throw new HttpException(404, 'Nachricht nicht gefunden.');
        }
        if ((int) $msg['user_id'] !== $req->userId()) {
            throw new HttpException(403, 'Nur eigene Nachrichten dürfen gelöscht werden.');
        }

        ChatMessage::remove((int) $msg['id']);
        $recipientId = $msg['recipient_id'] !== null ? (int) $msg['recipient_id'] : null;
        $payload     = ['id' => (int) $msg['id'], 'recipient_id' => $recipientId];
        self::fanOut($payload, $recipientId, (int) $msg['user_id'], 'chat:deleted');

        Response::noContent();
    }

    /** Route a chat event to the right WS rooms (DM → both parties, else broadcast). */
    private static function fanOut(array $payload, ?int $recipientId, int $authorId, string $event): void
    {
        if ($recipientId !== null) {
            Emitter::emit('user:' . $authorId,    $event, ['message' => $payload]);
            Emitter::emit('user:' . $recipientId, $event, ['message' => $payload]);
        } else {
            Emitter::emit('broadcast', $event, ['message' => $payload]);
        }
    }
}
