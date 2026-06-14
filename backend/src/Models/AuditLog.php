<?php

declare(strict_types=1);

namespace App\Models;

/**
 * AuditLog
 * -----------------------------------------------------------------------------
 * Schreibt und liest den Audit-Trail einer Aufgabe. `changes` enthält ein
 * vorher/nachher-Diff (oder beliebige Kontextdaten).
 */
final class AuditLog extends Model
{
    public static function record(?int $taskId, ?int $userId, string $action, array $changes = []): void
    {
        $stmt = self::db()->prepare(
            'INSERT INTO audit_logs (task_id, user_id, action, changes)
             VALUES (:t, :u, :a, :c)'
        );
        $stmt->execute([
            ':t' => $taskId,
            ':u' => $userId,
            ':a' => $action,
            ':c' => $changes === [] ? null : json_encode($changes, JSON_UNESCAPED_UNICODE),
        ]);
    }

    public static function forTask(int $taskId): array
    {
        $stmt = self::db()->prepare(
            'SELECT a.id, a.task_id, a.user_id, a.action, a.changes, a.created_at,
                    u.name AS user_name, u.email AS user_email
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             WHERE a.task_id = :t
             ORDER BY a.created_at DESC, a.id DESC'
        );
        $stmt->execute([':t' => $taskId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['changes'] = $row['changes'] ? json_decode($row['changes'], true) : null;
        }
        return $rows;
    }

    /**
     * Globaler Aktivitäts-Feed — alle Einträge, die der Nutzer sehen darf
     * (eigene Teams + eigene Aufgaben).
     *
     * Filter: team_id, user_id, action, limit (max 100).
     */
    public static function feed(int $viewerUserId, array $filters = []): array
    {
        $limit = min(100, max(1, (int) ($filters['limit'] ?? 50)));

        $sql = 'SELECT a.id, a.task_id, a.user_id, a.action, a.changes, a.created_at,
                       u.name AS user_name,
                       t.title AS task_title, t.status AS task_status, t.team_id,
                       tm_name.name AS team_name
                FROM audit_logs a
                LEFT JOIN users u ON u.id = a.user_id
                LEFT JOIN tasks t ON t.id = a.task_id
                LEFT JOIN teams tm_name ON tm_name.id = t.team_id
                WHERE (
                    t.created_by = :u1
                    OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = a.task_id AND ta.user_id = :u2)
                    OR EXISTS (SELECT 1 FROM team_members  tm WHERE tm.team_id  = t.team_id  AND tm.user_id  = :u3)
                )';

        $params = [':u1' => $viewerUserId, ':u2' => $viewerUserId, ':u3' => $viewerUserId];

        if (!empty($filters['team_id'])) {
            $sql .= ' AND t.team_id = :team_id';
            $params[':team_id'] = (int) $filters['team_id'];
        }
        if (!empty($filters['user_id'])) {
            $sql .= ' AND a.user_id = :filter_uid';
            $params[':filter_uid'] = (int) $filters['user_id'];
        }
        if (!empty($filters['action'])) {
            $sql .= ' AND a.action = :action';
            $params[':action'] = $filters['action'];
        }

        $sql .= ' ORDER BY a.created_at DESC, a.id DESC LIMIT :lim';

        $stmt = self::db()->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
        }
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['changes'] = $row['changes'] ? json_decode($row['changes'], true) : null;
        }
        return $rows;
    }
}
