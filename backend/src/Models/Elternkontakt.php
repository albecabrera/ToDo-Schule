<?php
declare(strict_types=1);
namespace App\Models;

final class Elternkontakt extends Model
{
    public static function forStudent(int $listId, string $studentName): array
    {
        $st = self::db()->prepare(
            'SELECT e.*, u.name as user_name FROM elternkontakte e
             LEFT JOIN users u ON u.id = e.user_id
             WHERE e.list_id = ? AND e.student_name = ?
             ORDER BY e.contact_date DESC, e.created_at DESC'
        );
        $st->execute([$listId, $studentName]);
        return $st->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function create(int $userId, array $data): array
    {
        $st = self::db()->prepare(
            'INSERT INTO elternkontakte (list_id, student_name, contact_date, contact_type, note, user_id)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $st->execute([
            (int) $data['list_id'],
            $data['student_name'],
            $data['contact_date'],
            $data['contact_type'] ?? 'telefon',
            $data['note'] ?? '',
            $userId,
        ]);
        $id = (int) self::db()->lastInsertId();
        return self::find($id);
    }

    public static function find(int $id): array
    {
        $st = self::db()->prepare(
            'SELECT e.*, u.name as user_name FROM elternkontakte e
             LEFT JOIN users u ON u.id = e.user_id WHERE e.id = ?'
        );
        $st->execute([$id]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function delete(int $id, int $userId): bool
    {
        $st = self::db()->prepare('DELETE FROM elternkontakte WHERE id = ? AND user_id = ?');
        $st->execute([$id, $userId]);
        return $st->rowCount() > 0;
    }

    public static function mapOut(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'listId'      => (int) $row['list_id'],
            'studentName' => $row['student_name'],
            'date'        => $row['contact_date'],
            'type'        => $row['contact_type'],
            'note'        => $row['note'],
            'userName'    => $row['user_name'] ?? '',
            'createdAt'   => $row['created_at'],
        ];
    }
}
