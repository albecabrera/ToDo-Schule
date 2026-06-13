<?php

declare(strict_types=1);

/**
 * bin/seed-teachers.php
 * -----------------------------------------------------------------------------
 * Legt Lehrer-Konten an. Login per Kürzel, Erstpasswort = Nachname,
 * must_change_password=1 (Frontend fordert danach den Passwortwechsel ein).
 *
 *   php bin/seed-teachers.php                          # Standard-Liste
 *   php bin/seed-teachers.php "ca:Alberto Cabrera" "ve:Lisa Venedey"
 *   php bin/seed-teachers.php "ca:Alberto Cabrera:alberto.cabrera@esg.nrw.schule"
 *
 * Format pro Argument:  kuerzel:Vorname Nachname[:email]
 * Ohne E-Mail wird kuerzel@esg.nrw.schule verwendet.
 */

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Config\Database;

$defaults = [
    'ca:Alberto Cabrera:alberto.cabrera@esg.nrw.schule',
    've:Venedey',
];

$entries = array_slice($argv, 1) ?: $defaults;
$pdo = Database::connection();

foreach ($entries as $entry) {
    [$abbr, $name, $email] = array_pad(explode(':', $entry, 3), 3, null);
    $abbr = strtolower(trim((string) $abbr));
    $name = trim((string) $name);

    if ($abbr === '' || $name === '') {
        fwrite(STDERR, "Übersprungen (Format kuerzel:Name[:email]): $entry\n");
        continue;
    }

    // Nachname = letztes Wort des Namens -> Erstpasswort.
    $parts = preg_split('/\s+/', $name);
    $lastName = $parts[count($parts) - 1];
    $email = strtolower(trim((string) $email)) ?: $abbr . '@esg.nrw.schule';

    $exists = $pdo->prepare('SELECT id FROM users WHERE abbreviation = :a OR email = :e');
    $exists->execute([':a' => $abbr, ':e' => $email]);
    if ($exists->fetch()) {
        echo "• $abbr ($name) existiert bereits — übersprungen\n";
        continue;
    }

    $pdo->prepare(
        'INSERT INTO users (email, abbreviation, password_hash, must_change_password, name)
         VALUES (:e, :a, :p, 1, :n)'
    )->execute([
        ':e' => $email,
        ':a' => $abbr,
        ':p' => password_hash($lastName, PASSWORD_BCRYPT),
        ':n' => $name,
    ]);

    echo "✓ $name angelegt — Login: $abbr / Erstpasswort: $lastName\n";
}
