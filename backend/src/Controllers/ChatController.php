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

        // Reaktionen gebündelt anhängen.
        $ids       = array_map(static fn ($m) => (int) $m['id'], $msgs);
        $reactions = ChatMessage::reactionsForMany($ids);
        foreach ($msgs as &$m) {
            $m['reactions'] = $reactions[(int) $m['id']] ?? [];
        }
        unset($m);

        $payload = ['messages' => $msgs];

        // Lesebestätigung (nur DM): bis zu welcher eigenen Nachricht hat der
        // Gesprächspartner gelesen? + eingehende DMs als gelesen markieren.
        if ($to !== null) {
            $payload['readUpTo'] = ChatMessage::lastReadBy($to, $req->userId());
            $lastIncoming = 0;
            foreach ($msgs as $m) {
                if ((int) $m['user_id'] === $to) {
                    $lastIncoming = max($lastIncoming, (int) $m['id']);
                }
            }
            if ($lastIncoming > 0) {
                ChatMessage::markRead($req->userId(), $to, $lastIncoming);
                Emitter::emit('user:' . $to, 'chat:read', [
                    'reader'     => $req->userId(),
                    'lastReadId' => $lastIncoming,
                ]);
            }
        }

        Response::json($payload);
    }

    /** POST /api/chat/typing  body: { to? } — flüchtiger „schreibt…"-Hinweis. */
    public static function typing(Request $req): void
    {
        $to = isset($req->body['to']) && $req->body['to'] !== null && $req->body['to'] !== ''
            ? (int) $req->body['to'] : null;
        $payload = ['userId' => $req->userId(), 'to' => $to];
        if ($to !== null) {
            Emitter::emit('user:' . $to, 'chat:typing', $payload);
        } else {
            Emitter::emit('broadcast', 'chat:typing', $payload);
        }
        Response::noContent();
    }

    /** POST /api/chat/read  body: { to, lastId } — DM als gelesen markieren. */
    public static function read(Request $req): void
    {
        $data   = Validator::make($req->body, [
            'to'     => 'required|int',
            'lastId' => 'required|int',
        ]);
        $peer   = (int) $data['to'];
        $lastId = (int) $data['lastId'];
        ChatMessage::markRead($req->userId(), $peer, $lastId);
        Emitter::emit('user:' . $peer, 'chat:read', [
            'reader'     => $req->userId(),
            'lastReadId' => $lastId,
        ]);
        Response::noContent();
    }

    /** POST /api/chat/:id/react  body: { emoji } — Reaktion an-/abschalten. */
    public static function react(Request $req): void
    {
        $msg = ChatMessage::find((int) $req->param('id'));
        if ($msg === null) {
            throw new HttpException(404, 'Nachricht nicht gefunden.');
        }
        $data  = Validator::make($req->body, ['emoji' => 'required|string|max:16']);
        $action = ChatMessage::toggleReaction((int) $msg['id'], $req->userId(), $data['emoji']);
        $reactions = ChatMessage::reactionsFor((int) $msg['id']);

        $recipientId = $msg['recipient_id'] !== null ? (int) $msg['recipient_id'] : null;
        self::fanOut(
            ['id' => (int) $msg['id'], 'reactions' => $reactions],
            $recipientId,
            (int) $msg['user_id'],
            'chat:reaction'
        );

        Response::json(['action' => $action, 'reactions' => $reactions]);
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
            'reply_to'        => 'nullable|int',
        ]);

        $content        = trim((string) ($data['content'] ?? ''));
        $attachmentUrl  = $data['attachment_url'] ?? null;
        $attachmentName = $data['attachment_name'] ?? null;
        $replyToId      = isset($data['reply_to']) && $data['reply_to'] !== null ? (int) $data['reply_to'] : null;

        if ($content === '' && $attachmentUrl === null) {
            throw new HttpException(422, 'Nachricht oder Datei erforderlich.');
        }

        $recipientId = isset($data['to']) && $data['to'] !== null ? (int) $data['to'] : null;
        $message     = ChatMessage::create($req->userId(), $content, $recipientId, $attachmentUrl, $attachmentName, $replyToId);

        self::fanOut($message, $recipientId, $req->userId(), 'chat:message');

        // @Erwähnungen: gezielte Benachrichtigung (+ Push) an genannte Kolleg:innen,
        // auch wenn sie den Thread gerade nicht offen haben (v. a. im Gruppenchat).
        $mentions = is_array($req->body['mentions'] ?? null) ? $req->body['mentions'] : [];
        $byName   = (string) ($message['user_name'] ?? '');
        $preview  = $content !== '' ? mb_substr($content, 0, 120) : '🎤 Sprachnachricht';
        foreach (array_unique(array_map('intval', $mentions)) as $uid) {
            if ($uid <= 0 || $uid === $req->userId()) {
                continue;
            }
            Emitter::emit('user:' . $uid, 'chat:mention', [
                'by'       => $req->userId(),
                'byName'   => $byName,
                'to'       => $recipientId,
                'preview'  => $preview,
                'message'  => $message,
            ]);
        }

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
    /**
     * POST /api/chat/call/signal  body: { to, kind, data? }
     * WebRTC-Signalisierung (1:1). Reicht Offer/Answer/ICE/Hangup an den
     * persönlichen Room des Gegenübers weiter. Medien laufen P2P, nicht hier.
     */
    public static function callSignal(Request $req): void
    {
        $data = Validator::make($req->body, [
            'to'   => 'required|int',
            'kind' => 'required|string|max:16',
        ]);
        $to = (int) $data['to'];
        Emitter::emit('user:' . $to, 'call:signal', [
            'from'     => $req->userId(),
            'kind'     => $data['kind'],
            'data'     => $req->body['data'] ?? null,
        ]);
        Response::noContent();
    }

    /** POST /api/chat/:id/pin — Nachricht an-/abpinnen. */
    public static function pin(Request $req): void
    {
        $msg = ChatMessage::find((int) $req->param('id'));
        if ($msg === null) {
            throw new HttpException(404, 'Nachricht nicht gefunden.');
        }
        $pinned      = ChatMessage::togglePin((int) $msg['id']);
        $recipientId = $msg['recipient_id'] !== null ? (int) $msg['recipient_id'] : null;
        self::fanOut(
            ['id' => (int) $msg['id'], 'pinned' => $pinned],
            $recipientId,
            (int) $msg['user_id'],
            'chat:pinned'
        );
        Response::json(['pinned' => $pinned]);
    }

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
