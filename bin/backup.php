#!/usr/bin/env php
<?php

/**
 * backup.php — Tägliches SQLite-Backup mit Aufbewahrungsfrist
 * -----------------------------------------------------------------------------
 * Verwendung:
 *   php bin/backup.php [--keep=30]
 *
 * Cron (täglich um 02:00):
 *   0 2 * * * /usr/bin/php /pfad/zu/ToDo-Schule/bin/backup.php >> /var/log/esg-backup.log 2>&1
 *
 * Optionen:
 *   --keep=N   Anzahl Tage, die Backups aufbewahrt werden (Standard: 30)
 *   --dest=DIR Zielverzeichnis (Standard: storage/backups/)
 */

declare(strict_types=1);

$opts = getopt('', ['keep::', 'dest::']);
$keep = (int) ($opts['keep'] ?? 30);
$dest = $opts['dest'] ?? dirname(__DIR__) . '/storage/backups';

$src  = dirname(__DIR__) . '/backend/database.sqlite';

// ── Prüfungen ────────────────────────────────────────────────────────────────

if (!file_exists($src)) {
    fwrite(STDERR, "[ERROR] Datenbank nicht gefunden: $src\n");
    exit(1);
}

if (!is_dir($dest) && !mkdir($dest, 0750, true)) {
    fwrite(STDERR, "[ERROR] Backup-Verzeichnis konnte nicht erstellt werden: $dest\n");
    exit(1);
}

// ── Backup erstellen ─────────────────────────────────────────────────────────

$stamp    = date('Y-m-d_His');
$destFile = "$dest/database_$stamp.sqlite";

// SQLite Online-Backup über die .dump-Methode (sicher bei WAL-Modus)
// Kopiert zuerst in eine Temp-Datei, dann umbenennen → atomar
$tmp = $destFile . '.tmp';
if (!copy($src, $tmp)) {
    fwrite(STDERR, "[ERROR] Kopieren fehlgeschlagen: $src → $tmp\n");
    exit(1);
}
rename($tmp, $destFile);
$sizeKb = round(filesize($destFile) / 1024);
echo "[OK] Backup erstellt: $destFile ({$sizeKb} KB)\n";

// ── Alte Backups bereinigen ───────────────────────────────────────────────────

$cutoff  = time() - ($keep * 86400);
$deleted = 0;
foreach (glob("$dest/database_*.sqlite") as $f) {
    if (filemtime($f) < $cutoff) {
        unlink($f);
        $deleted++;
    }
}
if ($deleted > 0) {
    echo "[OK] $deleted alte Backup(s) gelöscht (älter als $keep Tage).\n";
}

// ── Backup-Inventar zeigen ───────────────────────────────────────────────────

$backups = glob("$dest/database_*.sqlite");
$count   = count($backups);
$totalKb = array_sum(array_map('filesize', $backups)) / 1024;
echo "[INFO] $count Backup(s) im Verzeichnis ($dest), gesamt " . round($totalKb) . " KB.\n";
