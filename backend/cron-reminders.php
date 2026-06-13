<?php
/**
 * Cron: Erinnerungs-Benachrichtigungen
 * Ausführen z. B. jede Minute: * * * * * php /path/to/cron-reminders.php
 */

declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use App\Models\Model;

// Bootstrap DB
$dotenv = __DIR__ . '/.env';
if (file_exists($dotenv)) {
    foreach (file($dotenv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $_ENV['DB_HOST'] ?? '127.0.0.1',
        $_ENV['DB_PORT'] ?? '3306',
        $_ENV['DB_NAME'] ?? 'todo_schule'
    ),
    $_ENV['DB_USER'] ?? 'root',
    $_ENV['DB_PASS'] ?? '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::FETCH_DEFAULT => PDO::FETCH_ASSOC]
);

$now  = new DateTimeImmutable();
$from = $now->sub(new DateInterval('PT1M'))->format('Y-m-d H:i:s');
$to   = $now->add(new DateInterval('PT1M'))->format('Y-m-d H:i:s');

// Aufgaben, deren remind_at in der nächsten Minute liegt
$stmt = $pdo->prepare(
    'SELECT t.id, t.title, t.created_by, ta.user_id AS assignee_id
     FROM tasks t
     LEFT JOIN task_assignees ta ON ta.task_id = t.id
     WHERE t.remind_at BETWEEN :from AND :to
       AND t.status <> "done"'
);
$stmt->execute([':from' => $from, ':to' => $to]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$ins = $pdo->prepare(
    'INSERT IGNORE INTO notifications (user_id, type, actor_id, task_id, text, is_read, created_at)
     VALUES (:user_id, "due", NULL, :task_id, :text, 0, NOW())'
);

$notified = [];
foreach ($rows as $row) {
    $targets = array_filter([(int)$row['created_by'], (int)($row['assignee_id'] ?? 0)]);
    foreach (array_unique($targets) as $uid) {
        $key = "$uid:{$row['id']}";
        if (isset($notified[$key])) continue;
        $notified[$key] = true;
        $ins->execute([
            ':user_id' => $uid,
            ':task_id' => (int)$row['id'],
            ':text'    => "Erinnerung: <b>{$row['title']}</b>",
        ]);
        echo "Notified user $uid for task {$row['id']}: {$row['title']}\n";
    }
}

echo "Done. " . count($notified) . " notification(s) created.\n";
