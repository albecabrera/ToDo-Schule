<?php

declare(strict_types=1);

/**
 * public/index.php — Front Controller
 * -----------------------------------------------------------------------------
 * Einstiegspunkt für ALLE HTTP-Anfragen. Reihenfolge:
 *   1. Bootstrap (Autoloader, .env, Error->Exception)
 *   2. Zentraler Exception-Handler
 *   3. Security-Header (Helmet-Äquivalent) + CORS (inkl. Preflight)
 *   4. Request einlesen, Router dispatchen
 *
 * Lokal starten:
 *   php -S 0.0.0.0:8085 -t public
 */

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Config\Cors;
use App\Lib\Request;
use App\Lib\Response;
use App\Middleware\ErrorHandler;
use App\Middleware\SecurityHeaders;

// Jede nicht abgefangene Exception -> strukturiertes JSON { error, code }.
ErrorHandler::register();

SecurityHeaders::apply();
Cors::apply(); // beantwortet OPTIONS-Preflight selbst

// Healthcheck (praktisch für Deployment-Probes).
$_healthUri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$_scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php'), '/');
$_healthPath = ($_scriptDir !== '' && str_starts_with($_healthUri, $_scriptDir . '/'))
    ? substr($_healthUri, strlen($_scriptDir))
    : $_healthUri;
if ($_healthPath === '/health') {
    Response::json(['status' => 'ok', 'time' => gmdate('c')]);
}

/** @var App\Routes\Router $router */
$router = require dirname(__DIR__) . '/src/Routes/api.php';

$request = Request::capture();
$router->dispatch($request);
