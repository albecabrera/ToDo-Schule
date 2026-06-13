<?php

declare(strict_types=1);

/**
 * bin/ws-server.php — Einstiegspunkt für den WebSocket-Server (CLI).
 * -----------------------------------------------------------------------------
 * Starten:
 *   php bin/ws-server.php
 *
 * Liest WS_HOST / WS_PORT / WS_POLL_INTERVAL aus der .env. Läuft dauerhaft und
 * sollte in Produktion über einen Prozess-Manager (systemd, supervisor, pm2)
 * überwacht werden.
 */

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Config\Env;
use App\Sockets\WebSocketServer;

$server = new WebSocketServer(
    host: (string) Env::get('WS_HOST', '0.0.0.0'),
    port: Env::int('WS_PORT', 8090),
    pollInterval: Env::float('WS_POLL_INTERVAL', 1.0),
);

$server->run();
