<?php

declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use PDO;

/**
 * Model
 * -----------------------------------------------------------------------------
 * Schlanke Basisklasse: liefert die geteilte PDO-Verbindung und kleine Helfer.
 * Bewusst kein vollwertiges ORM — explizite SQL-Statements in den Modellen
 * halten die Logik nachvollziehbar (ideal für Lern-/Schulprojekt).
 */
abstract class Model
{
    public static function db(): PDO
    {
        return Database::connection();
    }

    /** Aktueller UTC-Zeitstempel im MySQL-DATETIME-Format. */
    protected static function now(): string
    {
        return (new \DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    }

    /** Erzeugt einen URL-sicheren Zufallstoken. */
    public static function randomToken(int $bytes = 24): string
    {
        return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
    }
}
