<?php

declare(strict_types=1);

namespace App\Routes;

use App\Controllers\AttachmentController;
use App\Controllers\AuthController;
use App\Controllers\AvatarController;
use App\Controllers\ChatController;
use App\Controllers\GdprController;
use App\Controllers\PushController;
use App\Controllers\CommentController;
use App\Controllers\NotificationController;
use App\Controllers\NoteController;
use App\Controllers\ShareController;
use App\Controllers\TaskController;
use App\Controllers\CalendarController;
use App\Controllers\ElternkontaktController;
use App\Controllers\KlasselisteController;
use App\Controllers\TeamController;
use App\Controllers\UserController;

/**
 * api.php
 * -----------------------------------------------------------------------------
 * Definiert alle REST-Routen. Gibt den konfigurierten Router zurück.
 *
 * Optionen pro Route:
 *   'auth'      => true       geschützt (Access-Token erforderlich)
 *   'rateLimit' => 'auth'     Rate-Limiting (Bucket-Name)
 */
return (static function (): Router {
    $r = new Router();

    // --- Auth (rate-limited, öffentlich) -------------------------------------
    $r->post('/api/auth/register', [AuthController::class, 'register'], ['rateLimit' => 'auth']);
    $r->post('/api/auth/login',    [AuthController::class, 'login'],    ['rateLimit' => 'auth']);
    $r->post('/api/auth/refresh',  [AuthController::class, 'refresh'],  ['rateLimit' => 'auth']);
    $r->post('/api/auth/logout',   [AuthController::class, 'logout']);
    $r->post('/api/auth/reset-password', [AuthController::class, 'resetPassword'], ['rateLimit' => 'auth']);

    // --- Profil & DSGVO -------------------------------------------------------
    $r->get('/api/users',                [UserController::class,  'colleagues'], ['auth' => true]);
    $r->get('/api/users/me',             [UserController::class,  'me'],         ['auth' => true]);
    $r->patch('/api/users/me',           [UserController::class,  'updateMe'],   ['auth' => true]);
    $r->post('/api/users/me/avatar',     [AvatarController::class,'upload'],     ['auth' => true]);
    $r->get('/api/users/me/export',      [GdprController::class,  'export'],     ['auth' => true]);
    $r->delete('/api/users/me',          [GdprController::class,  'deleteMe'],   ['auth' => true]);

    // --- Elternkontakte -----------------------------------------------------
    $r->get('/api/elternkontakte',         [ElternkontaktController::class, 'index'],   ['auth' => true]);
    $r->post('/api/elternkontakte',        [ElternkontaktController::class, 'store'],   ['auth' => true]);
    $r->delete('/api/elternkontakte/:id',  [ElternkontaktController::class, 'destroy'], ['auth' => true]);

    // --- Klasselisten --------------------------------------------------------
    $r->get('/api/klasselisten',            [KlasselisteController::class, 'index'],    ['auth' => true]);
    $r->post('/api/klasselisten',           [KlasselisteController::class, 'store'],    ['auth' => true]);
    $r->post('/api/klasselisten/presence',  [KlasselisteController::class, 'presence'], ['auth' => true]);
    $r->get('/api/klasselisten/:id',        [KlasselisteController::class, 'show'],     ['auth' => true]);
    $r->patch('/api/klasselisten/:id',      [KlasselisteController::class, 'update'],   ['auth' => true]);
    $r->delete('/api/klasselisten/:id',     [KlasselisteController::class, 'destroy'],  ['auth' => true]);

    // --- Aufgaben -------------------------------------------------------------
    $r->get('/api/calendar.ics', [CalendarController::class, 'ics']);
    $r->get('/api/calendar/token', [CalendarController::class, 'token'], ['auth' => true]);
    $r->get('/api/tasks',        [TaskController::class, 'index'],   ['auth' => true]);
    $r->post('/api/tasks',       [TaskController::class, 'store'],   ['auth' => true]);
    $r->get('/api/tasks/:id',    [TaskController::class, 'show'],    ['auth' => true]);
    $r->patch('/api/tasks/:id',  [TaskController::class, 'update'],  ['auth' => true]);
    $r->delete('/api/tasks/:id', [TaskController::class, 'destroy'], ['auth' => true]);

    // --- Zuweisungen ----------------------------------------------------------
    $r->patch('/api/tasks/:id/assign',   [TaskController::class, 'assign'],   ['auth' => true]);
    $r->patch('/api/tasks/:id/unassign', [TaskController::class, 'unassign'], ['auth' => true]);

    // --- Share-Links ----------------------------------------------------------
    $r->post('/api/tasks/:id/share',   [ShareController::class, 'create'],  ['auth' => true]);
    $r->delete('/api/tasks/:id/share', [ShareController::class, 'destroy'], ['auth' => true]);
    $r->get('/api/share/:token',       [ShareController::class, 'public']); // ÖFFENTLICH

    // --- Kommentare -----------------------------------------------------------
    $r->get('/api/tasks/:id/comments',              [CommentController::class, 'index'],   ['auth' => true]);
    $r->post('/api/tasks/:id/comments',             [CommentController::class, 'store'],   ['auth' => true]);
    $r->delete('/api/tasks/:id/comments/:commentId',[CommentController::class, 'destroy'], ['auth' => true]);

    // --- Notizen & Planungen ----------------------------------------------------
    $r->get('/api/notes',        [NoteController::class, 'index'],   ['auth' => true]);
    $r->post('/api/notes',       [NoteController::class, 'store'],   ['auth' => true]);
    $r->get('/api/notes/:id',    [NoteController::class, 'show'],    ['auth' => true]);
    $r->patch('/api/notes/:id',  [NoteController::class, 'update'],  ['auth' => true]);
    $r->delete('/api/notes/:id', [NoteController::class, 'destroy'], ['auth' => true]);

    // --- Teams ----------------------------------------------------------------
    $r->get('/api/teams',           [TeamController::class, 'index'],   ['auth' => true]);
    $r->post('/api/teams',          [TeamController::class, 'store'],   ['auth' => true]);
    $r->get('/api/teams/:id',       [TeamController::class, 'show'],    ['auth' => true]);
    $r->patch('/api/teams/:id',     [TeamController::class, 'update'],  ['auth' => true]);
    $r->delete('/api/teams/:id',    [TeamController::class, 'destroy'], ['auth' => true]);
    $r->post('/api/teams/:id/invite',[TeamController::class, 'invite'], ['auth' => true]);

    // --- Anhänge (Tasks) -----------------------------------------------------
    $r->get('/api/tasks/:id/attachments',                              [AttachmentController::class, 'indexTask'],  ['auth' => true]);
    $r->post('/api/tasks/:id/attachments',                             [AttachmentController::class, 'uploadTask'], ['auth' => true]);
    $r->delete('/api/tasks/:id/attachments/:attachId',                 [AttachmentController::class, 'destroy'],    ['auth' => true]);
    $r->get('/api/tasks/:id/attachments/:attachId/download',           [AttachmentController::class, 'download'],   ['auth' => true]);

    // --- Anhänge (Notes) -----------------------------------------------------
    $r->get('/api/notes/:id/attachments',                              [AttachmentController::class, 'indexNote'],  ['auth' => true]);
    $r->post('/api/notes/:id/attachments',                             [AttachmentController::class, 'uploadNote'], ['auth' => true]);

    // --- Benachrichtigungen --------------------------------------------------
    $r->get('/api/notifications',          [NotificationController::class, 'index'],       ['auth' => true]);
    $r->patch('/api/notifications/:id',    [NotificationController::class, 'markRead'],    ['auth' => true]);
    $r->post('/api/notifications/read-all',[NotificationController::class, 'markAllRead'], ['auth' => true]);

    // --- Chat ----------------------------------------------------------------
    $r->get('/api/chat/search',  [ChatController::class, 'search'],     ['auth' => true]);
    $r->get('/api/chat',         [ChatController::class, 'index'],      ['auth' => true]);
    $r->post('/api/chat',        [ChatController::class, 'store'],      ['auth' => true]);
    $r->post('/api/chat/upload', [ChatController::class, 'uploadFile'], ['auth' => true]);
    $r->patch('/api/chat/:id',   [ChatController::class, 'update'],     ['auth' => true]);
    $r->delete('/api/chat/:id',  [ChatController::class, 'destroy'],    ['auth' => true]);
    $r->post('/api/chat/typing', [ChatController::class, 'typing'],     ['auth' => true]);
    $r->post('/api/chat/read',   [ChatController::class, 'read'],       ['auth' => true]);
    $r->post('/api/chat/:id/react', [ChatController::class, 'react'],   ['auth' => true]);
    $r->post('/api/chat/:id/pin',   [ChatController::class, 'pin'],     ['auth' => true]);

    // --- Web-Push ------------------------------------------------------------
    $r->get('/api/push/public-key',  [PushController::class, 'publicKey'],   ['auth' => true]);
    $r->post('/api/push/subscribe',  [PushController::class, 'subscribe'],   ['auth' => true]);
    $r->post('/api/push/unsubscribe',[PushController::class, 'unsubscribe'], ['auth' => true]);

    return $r;
})();
