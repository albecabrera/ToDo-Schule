#!/usr/bin/env php
<?php
/**
 * Migra todos los datos de MariaDB/MySQL a SQLite.
 * Uso: php bin/migrate-to-sqlite.php [--force]
 */

declare(strict_types=1);

$root   = dirname(__DIR__);
$sqlite = $root . '/database.sqlite';
$schema = $root . '/schema.sqlite.sql';

// Cargar .env para credenciales de MySQL
$envPath = $root . '/.env';
$env = [];
if (is_file($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim($v, " \t\"'");
    }
}

$mysqlHost = $env['DB_HOST']     ?? '127.0.0.1';
$mysqlPort = $env['DB_PORT']     ?? '3306';
$mysqlDb   = $env['DB_DATABASE'] ?? 'todo_schule';
$mysqlUser = $env['DB_USERNAME'] ?? 'root';
$mysqlPass = $env['DB_PASSWORD'] ?? '';

$force = in_array('--force', $argv ?? [], true);
if (file_exists($sqlite) && !$force) {
    echo "database.sqlite already exists. Use --force to overwrite.\n";
    exit(0);
}

// ── Schritt 1: SQLite erstellen und Schema laden ──────────────────────────

echo "Creating SQLite database...\n";
@unlink($sqlite);

$sql = new PDO('sqlite:' . $sqlite);
$sql->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$sql->exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF;');
$sql->exec(file_get_contents($schema));
echo "Schema applied.\n";

// ── Schritt 2: Daten aus MariaDB lesen ───────────────────────────────────

try {
    $my = new PDO(
        "mysql:host=$mysqlHost;port=$mysqlPort;dbname=$mysqlDb;charset=utf8mb4",
        $mysqlUser, $mysqlPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    echo "Connected to MariaDB.\n";
} catch (PDOException $e) {
    echo "Cannot connect to MariaDB: " . $e->getMessage() . "\n";
    echo "SQLite schema created empty at $sqlite\n";
    exit(0);
}

// Tabellen in Reihenfolge (FK-Abhängigkeiten)
$tables = [
    'users', 'refresh_tokens', 'teams', 'team_members', 'team_invites',
    'tasks', 'task_assignees', 'comments', 'share_links',
    'notes', 'audit_logs', 'events', 'rate_limits',
    'notifications', 'chat_messages',
];

$sql->exec('PRAGMA foreign_keys = OFF;');
$sql->beginTransaction();

foreach ($tables as $table) {
    try {
        $rows = $my->query("SELECT * FROM `$table`")->fetchAll();
    } catch (PDOException $e) {
        echo "  skip $table (not found in MariaDB)\n";
        continue;
    }
    if (empty($rows)) {
        echo "  $table: 0 rows\n";
        continue;
    }
    $cols  = array_keys($rows[0]);
    $ph    = implode(',', array_fill(0, count($cols), '?'));
    $stmt  = $sql->prepare("INSERT INTO $table (" . implode(',', $cols) . ") VALUES ($ph)");
    $count = 0;
    foreach ($rows as $row) {
        try {
            $stmt->execute(array_values($row));
            $count++;
        } catch (PDOException $e) {
            echo "  WARNING $table row: " . $e->getMessage() . "\n";
        }
    }
    echo "  $table: $count rows\n";
}

$sql->commit();
$sql->exec('PRAGMA foreign_keys = ON;');
echo "Migration complete → $sqlite\n";

// ── Schritt 3: .env auf SQLite umstellen ─────────────────────────────────

if (!is_file($envPath)) {
    echo ".env not found, skipping update.\n";
    exit(0);
}

$content = file_get_contents($envPath);

// DB_DRIVER setzen / ersetzen
if (preg_match('/^DB_DRIVER=/m', $content)) {
    $content = preg_replace('/^DB_DRIVER=.*/m', 'DB_DRIVER=sqlite', $content);
} else {
    $content .= "\nDB_DRIVER=sqlite\n";
}
// DB_PATH setzen
if (preg_match('/^DB_PATH=/m', $content)) {
    $content = preg_replace('/^DB_PATH=.*/m', "DB_PATH=$sqlite", $content);
} else {
    $content .= "DB_PATH=$sqlite\n";
}

file_put_contents($envPath, $content);
echo ".env updated: DB_DRIVER=sqlite, DB_PATH=$sqlite\n";
