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
        // changes als JSON dekodieren
        foreach ($rows as &$row) {
            $row['changes'] = $row['changes'] ? json_decode($row['changes'], true) : null;
        }
        return $rows;
    }
}
