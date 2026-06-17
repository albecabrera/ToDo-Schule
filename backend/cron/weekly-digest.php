<?php
/**
 * Weekly Digest — Klasseliste
 * Cron: 0 8 * * 1 php /path/to/backend/cron/weekly-digest.php
 *
 * Sendet jeden Montag um 08:00 eine HTML-E-Mail an alle Lehrerinnen
 * mit dem aktuellen Stand aller Klasselisten.
 */

declare(strict_types=1);

$dbPath = dirname(__DIR__) . '/database.sqlite';

if (!file_exists($dbPath)) {
    echo "[weekly-digest] DB nicht gefunden: $dbPath\n";
    exit(1);
}

$pdo = new PDO('sqlite:' . $dbPath, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

// ── Lade alle Nutzer ─────────────────────────────────────────────────────────
$users = $pdo->query('SELECT name, email FROM users WHERE is_admin = 0 OR is_admin = 1')->fetchAll(PDO::FETCH_ASSOC);

// ── Lade alle Klasselisten ───────────────────────────────────────────────────
$lists = $pdo->query(
    'SELECT name, columns_json, students_json, checks_json, updated_at FROM klasselisten ORDER BY name'
)->fetchAll(PDO::FETCH_ASSOC);

if (empty($lists)) {
    echo "[weekly-digest] Keine Listen gefunden.\n";
    exit(0);
}

$date     = date('d.m.Y');
$weekday  = date('l', strtotime('last monday'));

// ── HTML-E-Mail aufbauen ─────────────────────────────────────────────────────
function pct(int $done, int $total): string {
    return $total > 0 ? round($done / $total * 100) . '%' : '—';
}

$tbody = '';
foreach ($lists as $list) {
    $columns  = json_decode($list['columns_json'],  true) ?? [];
    $students = json_decode($list['students_json'], true) ?? [];
    $checks   = json_decode($list['checks_json'],   true) ?? [];
    $total    = count($students);

    $colSummary = '';
    foreach ($columns as $col) {
        if ($col['type'] === 'date') {
            $done = count(array_filter(
                array_map(fn($si) => $checks["{$si}:{$col['id']}"] ?? null, range(0, $total - 1)),
                fn($v) => is_string($v) && $v !== ''
            ));
        } else {
            $done = count(array_filter(
                array_map(fn($si) => $checks["{$si}:{$col['id']}"] ?? false, range(0, $total - 1))
            ));
        }
        $p   = pct($done, $total);
        $bar = str_pad(str_repeat('█', (int) ($done / max($total, 1) * 10)), 10);
        $colSummary .= "<tr>
            <td style='padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:12px'>{$col['title']}</td>
            <td style='padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:" . ($done === $total ? '#16a34a' : '#1e293b') . ";font-size:12px'>{$done}/{$total}</td>
            <td style='padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;color:#64748b'>{$p}</td>
            <td style='padding:6px 12px;border-bottom:1px solid #f1f5f9'><span style='font-family:monospace;font-size:11px;color:#4f46e5'>{$bar}</span></td>
        </tr>";
    }

    $updatedAt = $list['updated_at'] ? date('d.m.Y H:i', strtotime($list['updated_at'])) : '—';

    $tbody .= "<tr>
        <td colspan='4' style='padding:12px 12px 4px;font-size:13px;font-weight:700;background:#f8fafc;color:#1e293b;border-top:2px solid #4f46e5'>
            📋 Klasse {$list['name']} — {$total} Schüler·innen &nbsp;<span style='font-weight:400;color:#94a3b8;font-size:11px'>Zuletzt: {$updatedAt}</span>
        </td>
    </tr>
    {$colSummary}";
}

$html = <<<HTML
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f8fafc;margin:0;padding:20px}
.card{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);overflow:hidden}
.hdr{background:linear-gradient(135deg,#312f80,#4f46e5);color:#fff;padding:24px 28px}
.hdr h1{margin:0 0 4px;font-size:20px;font-weight:800}
.hdr p{margin:0;font-size:12px;opacity:.75}
.ft{padding:14px 24px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9}
</style></head>
<body><div class="card">
<div class="hdr">
  <h1>📋 Wöchentlicher Klasselisten-Bericht</h1>
  <p>Stand: {$date} · ToDo-Schule · ESG Bonn-Bad Godesberg</p>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead><tr>
    <th style="padding:10px 12px;font-size:11px;font-weight:700;text-align:left;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0">Spalte</th>
    <th style="padding:10px 12px;font-size:11px;font-weight:700;text-align:center;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0">Abgaben</th>
    <th style="padding:10px 12px;font-size:11px;font-weight:700;text-align:center;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0">%</th>
    <th style="padding:10px 12px;font-size:11px;font-weight:700;text-align:left;color:#64748b;background:#f8fafc;border-bottom:2px solid #e2e8f0">Fortschritt</th>
  </tr></thead>
  <tbody>{$tbody}</tbody>
</table>
<div class="ft">Automatischer Bericht von ToDo-Schule · Jeden Montag um 08:00 Uhr</div>
</div></body></html>
HTML;

// ── E-Mail versenden ─────────────────────────────────────────────────────────
$subject = "=?UTF-8?B?" . base64_encode("📋 Klasselisten-Bericht – $date") . "?=";
$headers = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'From: ToDo-Schule <noreply@esg-bonn.de>',
    'X-Mailer: PHP/' . PHP_VERSION,
]);
$body = chunk_split(base64_encode($html));

$sent = 0;
foreach ($users as $user) {
    if (empty($user['email'])) continue;
    $to = "{$user['name']} <{$user['email']}>";
    if (mail($to, $subject, $body, $headers)) {
        echo "[weekly-digest] ✓ Gesendet an {$user['email']}\n";
        $sent++;
    } else {
        echo "[weekly-digest] ✗ Fehler bei {$user['email']}\n";
    }
}

echo "[weekly-digest] Fertig. $sent E-Mail(s) versandt.\n";
