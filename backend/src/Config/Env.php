<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Env
 * -----------------------------------------------------------------------------
 * Sehr einfacher .env-Parser (kein vlucas/phpdotenv nötig). Unterstützt
 * KEY=VALUE, Kommentare (#), optionale Anführungszeichen und leere Zeilen.
 * Werte landen in $_ENV und sind über Env::get() typsicher abrufbar.
 */
final class Env
{
    private static array $vars = [];
    private static bool $loaded = false;

    public static function load(string $path): void
    {
        if (self::$loaded) {
            return;
        }
        self::$loaded = true;

        if (!is_file($path)) {
            // .env darf in Produktion fehlen, wenn echte ENV-Variablen gesetzt sind.
            self::$vars = $_ENV + getenv();
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Inline-Kommentare entfernen (nur bei unquoted Werten)
            if ($value !== '' && $value[0] !== '"' && $value[0] !== "'") {
                $hashPos = strpos($value, ' #');
                if ($hashPos !== false) {
                    $value = rtrim(substr($value, 0, $hashPos));
                }
            }

            // Anführungszeichen entfernen
            if (strlen($value) >= 2) {
                $first = $value[0];
                $last = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            self::$vars[$key] = $value;
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $value = self::$vars[$key] ?? $_ENV[$key] ?? getenv($key);
        return $value === false || $value === null ? $default : $value;
    }

    public static function int(string $key, int $default = 0): int
    {
        $v = self::get($key);
        return $v === null ? $default : (int) $v;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $v = self::get($key);
        if ($v === null) {
            return $default;
        }
        return in_array(strtolower((string) $v), ['1', 'true', 'yes', 'on'], true);
    }

    public static function float(string $key, float $default = 0.0): float
    {
        $v = self::get($key);
        return $v === null ? $default : (float) $v;
    }
}
