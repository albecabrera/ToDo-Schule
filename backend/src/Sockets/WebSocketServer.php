<?php

declare(strict_types=1);

namespace App\Sockets;

use App\Config\Database;
use App\Config\Env;
use App\Lib\Jwt;
use App\Models\Team;

/**
 * WebSocketServer
 * -----------------------------------------------------------------------------
 * Abhängigkeitsfreier WebSocket-Server (RFC 6455) auf Basis von Streams. Kein
 * Ratchet / ReactPHP nötig.
 *
 * Ablauf:
 *   1. Client verbindet sich mit  ws://host:port/?token=<ACCESS_JWT>
 *   2. Handshake + JWT-Verifikation im Upgrade (auth.token).
 *   3. Nach Login tritt der Socket seinem persönlichen Room (user:<id>) und
 *      allen Team-Rooms (team:<id>) bei.
 *   4. Der Server pollt die `events`-Tabelle (von REST befüllt) und broadcastet
 *      neue Zeilen an die Sockets im passenden Room.
 *
 * Unterstützte ausgehende Events:
 *   task:created | task:updated | task:deleted | comment:added |
 *   comment:deleted | user:assigned | team:member_added
 */
final class WebSocketServer
{
    private const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

    /** @var array<int,array> Verbindungen, indiziert per Stream-ID. */
    private array $conns = [];

    private int $lastEventId = 0;
    private float $lastPoll = 0.0;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly float $pollInterval = 1.0,
    ) {}

    public function run(): void
    {
        $errno = 0;
        $errstr = '';
        $server = stream_socket_server("tcp://{$this->host}:{$this->port}", $errno, $errstr);
        if ($server === false) {
            fwrite(STDERR, "WS-Server konnte nicht starten: $errstr ($errno)\n");
            exit(1);
        }
        stream_set_blocking($server, false);

        // Nur künftige Events broadcasten (bestehende überspringen).
        $this->lastEventId = $this->maxEventId();
        $this->log("WebSocket-Server läuft auf ws://{$this->host}:{$this->port}");

        while (true) {
            $read = [$server];
            foreach ($this->conns as $c) {
                $read[] = $c['sock'];
            }
            $write = $except = [];

            // Blockiert bis zu pollInterval Sekunden auf Aktivität.
            $sec  = (int) floor($this->pollInterval);
            $usec = (int) (($this->pollInterval - $sec) * 1_000_000);
            @stream_select($read, $write, $except, $sec, $usec);

            foreach ($read as $sock) {
                if ($sock === $server) {
                    $this->accept($server);
                } else {
                    $this->onReadable($sock);
                }
            }

            // Event-Tabelle pollen (zeitgesteuert).
            if ((microtime(true) - $this->lastPoll) >= $this->pollInterval) {
                $this->pollEvents();
                $this->lastPoll = microtime(true);
            }
        }
    }

    // --- Verbindungsaufbau ----------------------------------------------------

    private function accept($server): void
    {
        $sock = @stream_socket_accept($server, 0);
        if ($sock === false) {
            return;
        }
        stream_set_blocking($sock, false);
        $this->conns[(int) $sock] = [
            'sock'      => $sock,
            'handshake' => false,
            'buffer'    => '',
            'uid'       => null,
            'rooms'     => [],
        ];
    }

    private function onReadable($sock): void
    {
        $id = (int) $sock;
        if (!isset($this->conns[$id])) {
            return;
        }
        $data = @fread($sock, 8192);
        if ($data === '' || $data === false) {
            // Peer hat geschlossen.
            if (feof($sock)) {
                $this->disconnect($sock);
            }
            return;
        }

        $conn = &$this->conns[$id];
        $conn['buffer'] .= $data;

        if (!$conn['handshake']) {
            if (str_contains($conn['buffer'], "\r\n\r\n")) {
                $this->doHandshake($sock, $conn['buffer']);
                $conn['buffer'] = '';
            }
            return;
        }

        // Vollständige Frames aus dem Puffer verarbeiten.
        while (($frame = $this->decodeFrame($conn['buffer'])) !== null) {
            [$opcode, $payload, $consumed] = $frame;
            $conn['buffer'] = substr($conn['buffer'], $consumed);

            if ($opcode === 0x8) {            // close
                $this->disconnect($sock);
                return;
            }
            if ($opcode === 0x9) {            // ping -> pong
                $this->send($sock, $payload, 0xA);
                continue;
            }
            if ($opcode === 0x1) {            // text (z. B. {"type":"ping"})
                $this->onMessage($sock, $payload);
            }
        }
    }

    private function doHandshake($sock, string $request): void
    {
        // Sec-WebSocket-Key auslesen.
        if (!preg_match('#Sec-WebSocket-Key:\s*(.+)\r\n#i', $request, $m)) {
            $this->disconnect($sock);
            return;
        }
        $key = trim($m[1]);

        // Token aus der Request-Line (GET /?token=...) holen.
        preg_match('#GET\s+(\S+)\s+HTTP#', $request, $rm);
        $path = $rm[1] ?? '/';
        parse_str((string) parse_url($path, PHP_URL_QUERY), $query);
        $token = $query['token'] ?? '';

        $uid = $this->authenticate($token);
        if ($uid === null) {
            // 401 senden und Verbindung schließen.
            $resp = "HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n";
            @fwrite($sock, $resp);
            $this->disconnect($sock);
            return;
        }

        $accept = base64_encode(sha1($key . self::GUID, true));
        $resp = "HTTP/1.1 101 Switching Protocols\r\n"
              . "Upgrade: websocket\r\n"
              . "Connection: Upgrade\r\n"
              . "Sec-WebSocket-Accept: $accept\r\n\r\n";
        @fwrite($sock, $resp);

        $conn = &$this->conns[(int) $sock];
        $conn['handshake'] = true;
        $conn['uid'] = $uid;
        $conn['rooms'] = $this->roomsForUser($uid);

        $this->log("User #$uid verbunden (Rooms: " . implode(', ', $conn['rooms']) . ')');
        $this->sendJson($sock, ['event' => 'connected', 'payload' => ['userId' => $uid]]);
    }

    /** Verifiziert den Access-JWT aus dem Handshake. */
    private function authenticate(string $token): ?int
    {
        if ($token === '') {
            return null;
        }
        try {
            $payload = Jwt::decode($token, (string) Env::get('JWT_ACCESS_SECRET'), 'access');
            return (int) ($payload['sub'] ?? 0) ?: null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function roomsForUser(int $uid): array
    {
        $rooms = ['user:' . $uid, 'broadcast'];
        foreach (Team::idsForUser($uid) as $teamId) {
            $rooms[] = 'team:' . $teamId;
        }
        return $rooms;
    }

    private function onMessage($sock, string $payload): void
    {
        $msg = json_decode($payload, true);
        if (is_array($msg) && ($msg['type'] ?? '') === 'ping') {
            $this->sendJson($sock, ['event' => 'pong', 'payload' => ['t' => time()]]);
        }
        // Weitere Client->Server-Nachrichten könnten hier verarbeitet werden.
    }

    // --- Event-Broadcasting ---------------------------------------------------

    private function pollEvents(): void
    {
        try {
            $rows = Database::withReconnect(function ($pdo) {
                $stmt = $pdo->prepare(
                    'SELECT id, channel, event, payload FROM events
                     WHERE id > :last ORDER BY id ASC LIMIT 200'
                );
                $stmt->execute([':last' => $this->lastEventId]);
                return $stmt->fetchAll();
            });
        } catch (\Throwable $e) {
            $this->log('DB-Poll-Fehler: ' . $e->getMessage());
            return;
        }

        foreach ($rows as $row) {
            $this->lastEventId = max($this->lastEventId, (int) $row['id']);
            $message = [
                'event'   => $row['event'],
                'payload' => $row['payload'] ? json_decode($row['payload'], true) : null,
            ];
            $this->broadcast($row['channel'], $message);
        }
    }

    private function broadcast(string $channel, array $message): void
    {
        foreach ($this->conns as $conn) {
            if (!$conn['handshake'] || !in_array($channel, $conn['rooms'], true)) {
                continue;
            }
            $this->sendJson($conn['sock'], $message);
        }
    }

    // --- Frame-Kodierung ------------------------------------------------------

    private function sendJson($sock, array $data): void
    {
        $this->send($sock, json_encode($data, JSON_UNESCAPED_UNICODE), 0x1);
    }

    /** Kodiert eine (unmaskierte) Server->Client-Nachricht. */
    private function send($sock, string $payload, int $opcode = 0x1): void
    {
        $len = strlen($payload);
        $frame = chr(0x80 | $opcode);

        if ($len <= 125) {
            $frame .= chr($len);
        } elseif ($len <= 65535) {
            $frame .= chr(126) . pack('n', $len);
        } else {
            $frame .= chr(127) . pack('J', $len);
        }
        $frame .= $payload;
        @fwrite($sock, $frame);
    }

    /**
     * Dekodiert genau EINEN Frame aus dem Puffer.
     * @return array{0:int,1:string,2:int}|null [opcode, payload, consumedBytes] oder null bei unvollständigem Frame.
     */
    private function decodeFrame(string $buf): ?array
    {
        $len = strlen($buf);
        if ($len < 2) {
            return null;
        }
        $b1 = ord($buf[0]);
        $b2 = ord($buf[1]);
        $opcode  = $b1 & 0x0F;
        $masked  = ($b2 & 0x80) === 0x80;
        $payLen  = $b2 & 0x7F;
        $offset  = 2;

        if ($payLen === 126) {
            if ($len < 4) return null;
            $payLen = unpack('n', substr($buf, 2, 2))[1];
            $offset = 4;
        } elseif ($payLen === 127) {
            if ($len < 10) return null;
            $payLen = unpack('J', substr($buf, 2, 8))[1];
            $offset = 10;
        }

        $maskKey = '';
        if ($masked) {
            if ($len < $offset + 4) return null;
            $maskKey = substr($buf, $offset, 4);
            $offset += 4;
        }

        if ($len < $offset + $payLen) {
            return null; // Frame noch nicht vollständig empfangen.
        }

        $payload = substr($buf, $offset, $payLen);
        if ($masked) {
            $unmasked = '';
            for ($i = 0; $i < $payLen; $i++) {
                $unmasked .= $payload[$i] ^ $maskKey[$i % 4];
            }
            $payload = $unmasked;
        }

        return [$opcode, $payload, $offset + $payLen];
    }

    private function disconnect($sock): void
    {
        $id = (int) $sock;
        if (isset($this->conns[$id])) {
            $uid = $this->conns[$id]['uid'];
            unset($this->conns[$id]);
            if ($uid !== null) {
                $this->log("User #$uid getrennt");
            }
        }
        @fclose($sock);
    }

    private function maxEventId(): int
    {
        try {
            return (int) Database::connection()->query('SELECT COALESCE(MAX(id), 0) FROM events')->fetchColumn();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function log(string $msg): void
    {
        fwrite(STDOUT, '[' . gmdate('H:i:s') . "] $msg\n");
    }
}
