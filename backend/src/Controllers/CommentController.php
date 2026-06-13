<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Emitter;
use App\Lib\HttpException;
use App\Lib\Policy;
use App\Lib\Request;
use App\Lib\Response;
use App\Lib\Validator;
use App\Models\AuditLog;
use App\Models\Comment;

/**
 * CommentController
 * -----------------------------------------------------------------------------
 * Kommentare einer Aufgabe auflisten, hinzufügen und löschen.
 */
final class CommentController
{
    public static function index(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertView($task, $req->userId());

        Response::json(['comments' => Comment::listForTask((int) $task['id'])]);
    }

    public static function store(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertView($task, $req->userId());

        $data = Validator::make($req->body, ['content' => 'required|string|min:1|max:2000']);

        $comment = Comment::create((int) $task['id'], $req->userId(), $data['content']);
        // Anzeigedaten des Autors ergänzen.
        $comment['user_name']  = $req->user['name'] ?? null;
        $comment['user_email'] = $req->user['email'] ?? null;

        AuditLog::record((int) $task['id'], $req->userId(), 'comment.added', [
            'commentId' => (int) $comment['id'],
        ]);

        // Echtzeit-Broadcast an alle Beteiligten.
        Emitter::emitMany(Policy::taskChannels($task), 'comment:added', [
            'taskId'  => (int) $task['id'],
            'comment' => $comment,
        ]);

        Response::json(['comment' => $comment], 201);
    }

    public static function destroy(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        $comment = Comment::find((int) $req->param('commentId'));

        if ($comment === null || (int) $comment['task_id'] !== (int) $task['id']) {
            throw HttpException::notFound('Kommentar nicht gefunden', 'comment_not_found');
        }
        // Nur der Verfasser darf löschen.
        if ((int) $comment['user_id'] !== $req->userId()) {
            throw HttpException::forbidden('Nur der Verfasser darf den Kommentar löschen', 'not_comment_owner');
        }

        Comment::delete((int) $comment['id']);
        AuditLog::record((int) $task['id'], $req->userId(), 'comment.deleted', [
            'commentId' => (int) $comment['id'],
        ]);

        Emitter::emitMany(Policy::taskChannels($task), 'comment:deleted', [
            'taskId'    => (int) $task['id'],
            'commentId' => (int) $comment['id'],
        ]);

        Response::noContent();
    }
}
