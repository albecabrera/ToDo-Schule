<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Task
 * -----------------------------------------------------------------------------
 * Aufgaben inkl. Zuweisungen (task_assignees). Liefert Aufgaben stets mit
 * eingebetteter assignees[]-Liste (User-IDs) zurück.
 */
final class Task extends Model
{
    /**
     * Alle Aufgaben, die der Nutzer sehen darf:
     *   - selbst erstellt, ODER
     *   - ihm zugewiesen, ODER
     *   - in einem seiner Teams.
     */
    public static function allForUser(int $userId, array $filters = []): array
    {
        $sql = 'SELECT DISTINCT t.* FROM tasks t
                LEFT JOIN task_assignees ta ON ta.task_id = t.id
                LEFT JOIN team_members  tm ON tm.team_id = t.team_id
                WHERE (t.created_by = :u1 OR ta.user_id = :u2 OR tm.user_id = :u3)';
        $params = [':u1' => $userId, ':u2' => $userId, ':u3' => $userId];

        if (!empty($filters['status'])) {
            $sql .= ' AND t.status = :status';
            $params[':status'] = $filters['status'];
        }
        if (!empty($filters['teamId'])) {
            $sql .= ' AND t.team_id = :team';
            $params[':team'] = (int) $filters['teamId'];
        }
        if (!empty($filters['q'])) {
            $sql .= ' AND (t.title LIKE :q OR t.description LIKE :q)';
            $params[':q'] = '%' . $filters['q'] . '%';
        }
        $sql .= ' ORDER BY t.created_at DESC';

        $stmt = self::db()->prepare($sql);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();

        return array_map([self::class, 'withAssignees'], $tasks);
    }

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM tasks WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $task = $stmt->fetch();
        return $task ? self::withAssignees($task) : null;
    }

    public static function create(array $data, int $userId): array
    {
        $pdo = self::db();
        $stmt = $pdo->prepare(
            'INSERT INTO tasks (title, description, status, priority, due_date, remind_at, team_id, created_by, subtasks, tags)
             VALUES (:title, :description, :status, :priority, :due_date, :remind_at, :team_id, :created_by, :subtasks, :tags)'
        );
        $stmt->execute([
            ':title'       => $data['title'],
            ':description' => $data['description'] ?? null,
            ':status'      => $data['status']     ?? 'todo',
            ':priority'    => $data['priority']   ?? 'medium',
            ':due_date'    => $data['dueDate']    ?? null,
            ':remind_at'   => $data['remindAt']   ?? null,
            ':team_id'     => $data['teamId']     ?? null,
            ':created_by'  => $userId,
            ':subtasks'    => isset($data['subtasks']) ? json_encode($data['subtasks']) : null,
            ':tags'        => isset($data['tags'])     ? json_encode($data['tags'])     : null,
        ]);
        $id = (int) $pdo->lastInsertId();

        if (!empty($data['assignees']) && is_array($data['assignees'])) {
            self::setAssignees($id, $data['assignees']);
        }
        return self::find($id);
    }

    /**
     * Aktualisiert erlaubte Felder. Gibt [task, changes] zurück, wobei changes
     * ein vorher/nachher-Diff für das Audit-Log ist.
     */
    public static function update(int $id, array $data): array
    {
        $before = self::find($id);
        $map = [
            'title'       => 'title',
            'description' => 'description',
            'status'      => 'status',
            'priority'    => 'priority',
            'dueDate'     => 'due_date',
            'remindAt'    => 'remind_at',
            'teamId'      => 'team_id',
        ];
        $jsonFields = ['subtasks', 'tags'];

        $set = [];
        $params = [':id' => $id];
        $changes = [];

        foreach ($map as $input => $col) {
            if (array_key_exists($input, $data)) {
                $set[] = "$col = :$col";
                $params[":$col"] = $data[$input];
                $oldVal = $before[$col] ?? null;
                $newVal = $data[$input];
                if ((string) $oldVal !== (string) $newVal) {
                    $changes[$input] = ['from' => $oldVal, 'to' => $newVal];
                }
            }
        }

        foreach ($jsonFields as $field) {
            if (array_key_exists($field, $data)) {
                $set[] = "$field = :$field";
                $params[":$field"] = is_array($data[$field]) ? json_encode($data[$field]) : null;
            }
        }

        if ($set !== []) {
            $sql = 'UPDATE tasks SET ' . implode(', ', $set) . ' WHERE id = :id';
            self::db()->prepare($sql)->execute($params);
        }

        if (array_key_exists('assignees', $data) && is_array($data['assignees'])) {
            $oldAssignees = self::assigneeIds($id);
            self::setAssignees($id, $data['assignees']);
            $newAssignees = self::assigneeIds($id);
            if ($oldAssignees !== $newAssignees) {
                $changes['assignees'] = ['from' => $oldAssignees, 'to' => $newAssignees];
            }
        }

        return [self::find($id), $changes];
    }

    public static function delete(int $id): void
    {
        self::db()->prepare('DELETE FROM tasks WHERE id = :id')->execute([':id' => $id]);
    }

    // --- Zuweisungen ----------------------------------------------------------

    public static function setAssignees(int $taskId, array $userIds): void
    {
        $pdo = self::db();
        $pdo->prepare('DELETE FROM task_assignees WHERE task_id = :t')->execute([':t' => $taskId]);
        $ins = $pdo->prepare('INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (:t, :u)');
        foreach (array_unique(array_map('intval', $userIds)) as $uid) {
            $ins->execute([':t' => $taskId, ':u' => $uid]);
        }
    }

    public static function addAssignees(int $taskId, array $userIds): void
    {
        $ins = self::db()->prepare('INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (:t, :u)');
        foreach (array_unique(array_map('intval', $userIds)) as $uid) {
            $ins->execute([':t' => $taskId, ':u' => $uid]);
        }
    }

    public static function removeAssignees(int $taskId, array $userIds): void
    {
        if ($userIds === []) {
            return;
        }
        $ids = array_values(array_unique(array_map('intval', $userIds)));
        $in = implode(',', array_fill(0, count($ids), '?'));
        $stmt = self::db()->prepare("DELETE FROM task_assignees WHERE task_id = ? AND user_id IN ($in)");
        $stmt->execute(array_merge([$taskId], $ids));
    }

    /** @return int[] */
    public static function assigneeIds(int $taskId): array
    {
        $stmt = self::db()->prepare('SELECT user_id FROM task_assignees WHERE task_id = :t ORDER BY user_id');
        $stmt->execute([':t' => $taskId]);
        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    private static function withAssignees(array $task): array
    {
        $task['assignees'] = self::assigneeIds((int) $task['id']);
        $task['subtasks']  = !empty($task['subtasks']) ? (json_decode($task['subtasks'], true) ?? []) : [];
        $task['tags']      = !empty($task['tags'])     ? (json_decode($task['tags'],     true) ?? []) : [];
        return $task;
    }
}
