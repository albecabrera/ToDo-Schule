<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\HttpException;
use App\Lib\Policy;
use App\Lib\Request;
use App\Lib\Response;
use App\Models\Attachment;

final class AttachmentController
{
    private static function uploadsDir(): string
    {
        $dir = dirname(__DIR__, 2) . '/uploads';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    public static function indexTask(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertView($task, $req->userId());
        Response::json(['attachments' => Attachment::allForTask((int) $task['id'])]);
    }

    public static function indexNote(Request $req): void
    {
        Response::json(['attachments' => Attachment::allForNote((int) $req->param('id'))]);
    }

    public static function uploadTask(Request $req): void
    {
        $task = Policy::task((int) $req->param('id'));
        Policy::assertView($task, $req->userId());
        self::handleUpload($req, (int) $task['id'], null);
    }

    public static function uploadNote(Request $req): void
    {
        self::handleUpload($req, null, (int) $req->param('id'));
    }

    private static function handleUpload(Request $req, ?int $taskId, ?int $noteId): void
    {
        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $code = $_FILES['file']['error'] ?? -1;
            throw new HttpException(400, "Upload error: $code");
        }
        $file = $_FILES['file'];

        if ((int) $file['size'] > Attachment::MAX_SIZE) {
            throw new HttpException(413, 'File too large (max 50 MB)');
        }

        $mime = Attachment::resolveMime($file['tmp_name'], $file['name']);
        if ($mime === '') {
            throw new HttpException(415, 'File type not allowed');
        }

        $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = uniqid('att_', true) . ($ext !== '' ? ".$ext" : '');
        $dest     = self::uploadsDir() . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            throw new HttpException(500, 'Could not save file');
        }

        $att = Attachment::create([
            'task_id'       => $taskId,
            'note_id'       => $noteId,
            'filename'      => $filename,
            'original_name' => $file['name'],
            'mime_type'     => $mime,
            'size'          => $file['size'],
            'uploaded_by'   => $req->userId(),
        ]);

        Response::json(['attachment' => $att], 201);
    }

    public static function destroy(Request $req): void
    {
        $att = Attachment::find((int) $req->param('attachId'));
        if (!$att) {
            throw new HttpException(404, 'Attachment not found');
        }
        if ((int) $att['uploaded_by'] !== $req->userId()) {
            throw new HttpException(403, 'Forbidden');
        }

        $filename = Attachment::delete((int) $req->param('attachId'));
        if ($filename !== null) {
            $path = self::uploadsDir() . '/' . $filename;
            if (file_exists($path)) {
                unlink($path);
            }
        }
        Response::noContent();
    }

    public static function download(Request $req): void
    {
        $att = Attachment::find((int) $req->param('attachId'));
        if (!$att) {
            throw new HttpException(404, 'Not found');
        }

        if ($att['task_id'] !== null) {
            $task = Policy::task((int) $att['task_id']);
            Policy::assertView($task, $req->userId());
        }

        $path = self::uploadsDir() . '/' . $att['filename'];
        if (!file_exists($path)) {
            throw new HttpException(404, 'File missing from storage');
        }

        header('Content-Type: ' . $att['mime_type']);
        header('Content-Disposition: attachment; filename="' . addslashes($att['original_name']) . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=3600');
        readfile($path);
        exit;
    }
}
