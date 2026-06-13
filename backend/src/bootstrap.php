<?php
/**
 * bootstrap.php
 * -----------------------------------------------------------------------------
 * Lädt Umgebungsvariablen, registriert den PSR-4-Autoloader (App\ => src/) und
 * konfiguriert globale Fehler-/Exception-Handler. Wird von public/index.php und
 * bin/ws-server.php am Anfang eingebunden.
 *
 * Bewusst abhängigkeitsfrei: kein Composer-Autoload nötig.
 */

declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
define('APP_SRC', __DIR__);

// --- Minimaler PSR-4-Autoloader: App\Foo\Bar  =>  src/Foo/Bar.php -------------
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = APP_SRC . '/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

// --- .env laden ---------------------------------------------------------------
\App\Config\Env::load(APP_ROOT . '/.env');

// --- PHP-Fehler in Exceptions umwandeln (sauberes JSON-Error-Handling) --------
error_reporting(E_ALL);
ini_set('display_errors', '0'); // niemals rohe HTML-Fehler ausgeben

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

date_default_timezone_set('UTC');
