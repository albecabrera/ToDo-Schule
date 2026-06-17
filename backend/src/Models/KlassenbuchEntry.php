<?php
declare(strict_types=1);
namespace App\Models;

final class KlassenbuchEntry extends Model
{
    public static function forList(int $listId): array
    {
        $st = self::db()->prepare(
            'SELECT k.*, u.name as user_name FROM klassenbuch k
             LEFT JOIN users u ON u.id = k.user_id
             WHERE k.list_id = ? ORDER BY k.entry_date DESC, k.created_at DESC'
        );
        $st->execute([$listId]);
        return $st->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function find(int $id): ?array
    {
        $st = self::db()->prepare(
            'SELECT k.*, u.name as user_name FROM klassenbuch k
             LEFT JOIN users u ON u.id = k.user_id WHERE k.id = ?'
        );
        $st->execute([$id]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function create(int $userId, array $data): array
    {
        $now = self::now();
        $st = self::db()->prepare(
            'INSERT INTO klassenbuch (list_id, entry_date, topic, content, absenzen, notizen, user_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $st->execute([
            (int) $data['list_id'],
            $data['entry_date'] ?? date('Y-m-d'),
            $data['topic'] ?? '',
            $data['content'] ?? '',
            json_encode($data['absenzen'] ?? [], JSON_UNESCAPED_UNICODE),
            $data['notizen'] ?? '',
            $userId,
            $now, $now,
        ]);
        return self::find((int) self::db()->lastInsertId());
    }

    public static function update(int $id, array $data): ?array
    {
        $now  = self::now();
        $sets = ['updated_at = ?'];
        $params = [$now];

        foreach (['topic','content','notizen','entry_date'] as $f) {
            if (array_key_exists($f, $data)) { $sets[] = "$f = ?"; $params[] = $data[$f]; }
        }
        if (array_key_exists('absenzen', $data)) {
            $sets[]   = 'absenzen = ?';
            $params[] = json_encode($data['absenzen'], JSON_UNESCAPED_UNICODE);
        }
        $params[] = $id;
        self::db()->prepare('UPDATE klassenbuch SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
        return self::find($id);
    }

    public static function delete(int $id): bool
    {
        $st = self::db()->prepare('DELETE FROM klassenbuch WHERE id = ?');
        $st->execute([$id]);
        return $st->rowCount() > 0;
    }

    public static function mapOut(array $row): array
    {
        return [
            'id'        => (int) $row['id'],
            'listId'    => (int) $row['list_id'],
            'date'      => $row['entry_date'],
            'topic'     => $row['topic'],
            'content'   => $row['content'],
            'absenzen'  => json_decode($row['absenzen'], true) ?? [],
            'notizen'   => $row['notizen'],
            'userName'  => $row['user_name'] ?? '',
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
}
