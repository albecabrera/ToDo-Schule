<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Note
 * -----------------------------------------------------------------------------
 * Notizen & Unterrichtsplanungen. Ohne team_id privat, mit team_id für alle
 * Teammitglieder sichtbar (kollegiales Teilen).
 */
final class Note extends Model
{
    /** Eigene Notizen + alle Notizen der eigenen Teams. */
    public static function allForUser(int $userId, array $filters = []): array
    {
        $sql = 'SELECT DISTINCT n.*, u.name AS author_name FROM notes n
                JOIN users u ON u.id = n.created_by
                LEFT JOIN team_members tm ON tm.team_id = n.team_id
                WHERE (n.created_by = :u1 OR tm.user_id = :u2)';
        $params = [':u1' => $userId, ':u2' => $userId];

        if (!empty($filters['kind'])) {
            $sql .= ' AND n.kind = :kind';
            $params[':kind'] = $filters['kind'];
        }
        if (!empty($filters['teamId'])) {
            $sql .= ' AND n.team_id = :team';
            $params[':team'] = (int) $filters['teamId'];
        }
        $sql .= ' ORDER BY n.updated_at DESC';

        $stmt = self::db()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare(
            'SELECT n.*, u.name AS author_name FROM notes n
             JOIN users u ON u.id = n.created_by WHERE n.id = :id'
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data, int $userId): array
    {
        $pdo = self::db();
        $pdo->prepare(
            'INSERT INTO notes (title, content, kind, team_id, created_by)
             VALUES (:title, :content, :kind, :team_id, :created_by)'
        )->execute([
            ':title'      => $data['title'],
            ':content'    => $data['content'] ?? '',
            ':kind'       => $data['kind'] ?? 'note',
            ':team_id'    => $data['teamId'] ?? null,
            ':created_by' => $userId,
        ]);
        return self::find((int) $pdo->lastInsertId());
    }

    public static function update(int $id, array $data): array
    {
        $map = ['title' => 'title', 'content' => 'content', 'kind' => 'kind', 'teamId' => 'team_id'];
        $set = [];
        $params = [':id' => $id];
        foreach ($map as $input => $col) {
            if (array_key_exists($input, $data)) {
                $set[] = "$col = :$col";
                $params[":$col"] = $data[$input];
            }
        }
        if ($set !== []) {
            self::db()->prepare('UPDATE notes SET ' . implode(', ', $set) . ' WHERE id = :id')
                ->execute($params);
        }
        return self::find($id);
    }

    public static function delete(int $id): void
    {
        self::db()->prepare('DELETE FROM notes WHERE id = :id')->execute([':id' => $id]);
    }
}
