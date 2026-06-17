<?php

declare(strict_types=1);

namespace App\Models;

final class Klasse extends Model
{
    /** Alle Listen — keine Benutzerfilterung, kooperativer Zugriff */
    public static function all(): array
    {
        $st = self::db()->prepare(
            'SELECT id, user_id, name, columns_json, students_json, checks_json, updated_at
             FROM klasselisten ORDER BY name'
        );
        $st->execute();
        return $st->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** @deprecated Rückwärtskompatibilität */
    public static function forUser(int $userId): array
    {
        return self::all();
    }

    public static function find(int $id): ?array
    {
        $st = self::db()->prepare('SELECT * FROM klasselisten WHERE id = ?');
        $st->execute([$id]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    public static function create(int $userId, array $data): array
    {
        $now = self::now();
        $st = self::db()->prepare(
            'INSERT INTO klasselisten (user_id, name, columns_json, students_json, checks_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $st->execute([
            $userId,
            $data['name'] ?? 'Klasse',
            json_encode($data['columns'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($data['students'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode((object) []),
            $now,
            $now,
        ]);
        return self::find((int) self::db()->lastInsertId());
    }

    public static function update(int $id, array $data): ?array
    {
        $now    = self::now();
        $sets   = [];
        $params = [];

        if (array_key_exists('name', $data)) {
            $sets[]   = 'name = ?';
            $params[] = $data['name'];
        }
        if (array_key_exists('columns', $data)) {
            $sets[]   = 'columns_json = ?';
            $params[] = json_encode($data['columns'], JSON_UNESCAPED_UNICODE);
        }
        if (array_key_exists('students', $data)) {
            $sets[]   = 'students_json = ?';
            $params[] = json_encode($data['students'], JSON_UNESCAPED_UNICODE);
        }
        if (array_key_exists('checks', $data)) {
            $sets[]   = 'checks_json = ?';
            $params[] = json_encode($data['checks'] ?: (object) [], JSON_UNESCAPED_UNICODE);
        }

        if ($sets) {
            $sets[]   = 'updated_at = ?';
            $params[] = $now;
            $params[] = $id;
            self::db()->prepare(
                'UPDATE klasselisten SET ' . implode(', ', $sets) . ' WHERE id = ?'
            )->execute($params);
        }

        return self::find($id);
    }

    public static function delete(int $id): bool
    {
        $st = self::db()->prepare('DELETE FROM klasselisten WHERE id = ?');
        $st->execute([$id]);
        return $st->rowCount() > 0;
    }

    public static function mapOut(array $row): array
    {
        return [
            'id'        => (int) $row['id'],
            'name'      => $row['name'],
            'columns'   => json_decode($row['columns_json'], true) ?? [],
            'students'  => json_decode($row['students_json'], true) ?? [],
            'checks'    => json_decode($row['checks_json'], true) ?? (object) [],
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}
