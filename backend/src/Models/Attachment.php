<?php

declare(strict_types=1);

namespace App\Models;

final class Attachment extends Model
{
    public const ALLOWED_MIME = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv',
        'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
        'video/mp4', 'video/avi', 'video/quicktime', 'video/webm', 'video/x-msvideo',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/zip',
        'application/x-rar-compressed', 'application/x-zip-compressed',
        'application/x-7z-compressed',
        'application/octet-stream',
    ];

    private const EXT_MIME_MAP = [
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc'  => 'application/msword',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt'  => 'application/vnd.ms-powerpoint',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls'  => 'application/vnd.ms-excel',
        'mp3'  => 'audio/mpeg',
        'mp4'  => 'video/mp4',
        'txt'  => 'text/plain',
        'csv'  => 'text/csv',
        'pdf'  => 'application/pdf',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'svg'  => 'image/svg+xml',
        'zip'  => 'application/zip',
        'rar'  => 'application/x-rar-compressed',
        '7z'   => 'application/x-7z-compressed',
    ];

    public const MAX_SIZE = 52_428_800; // 50 MB

    public static function allForTask(int $taskId): array
    {
        $stmt = self::db()->prepare(
            'SELECT a.*, u.name AS uploader_name
             FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by
             WHERE a.task_id = :t ORDER BY a.created_at ASC'
        );
        $stmt->execute([':t' => $taskId]);
        return $stmt->fetchAll();
    }

    public static function allForNote(int $noteId): array
    {
        $stmt = self::db()->prepare(
            'SELECT a.*, u.name AS uploader_name
             FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by
             WHERE a.note_id = :n ORDER BY a.created_at ASC'
        );
        $stmt->execute([':n' => $noteId]);
        return $stmt->fetchAll();
    }

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM attachments WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): array
    {
        $pdo = self::db();
        $pdo->prepare(
            'INSERT INTO attachments (task_id, note_id, filename, original_name, mime_type, size, uploaded_by)
             VALUES (:task_id, :note_id, :filename, :original_name, :mime_type, :size, :uploaded_by)'
        )->execute([
            ':task_id'       => $data['task_id']       ?? null,
            ':note_id'       => $data['note_id']       ?? null,
            ':filename'      => $data['filename'],
            ':original_name' => $data['original_name'],
            ':mime_type'     => $data['mime_type'],
            ':size'          => (int) $data['size'],
            ':uploaded_by'   => (int) $data['uploaded_by'],
        ]);
        return self::find((int) $pdo->lastInsertId());
    }

    public static function delete(int $id): ?string
    {
        $row = self::find($id);
        if (!$row) {
            return null;
        }
        self::db()->prepare('DELETE FROM attachments WHERE id = :id')->execute([':id' => $id]);
        return $row['filename'];
    }

    public static function resolveMime(string $tmpPath, string $originalName): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($tmpPath);

        if (in_array($mime, self::ALLOWED_MIME, true)) {
            return $mime;
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        return self::EXT_MIME_MAP[$ext] ?? '';
    }
}
