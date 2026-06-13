# ToDo-Schule — Backend (PHP + MySQL)

Vollständiges, produktionsreifes Backend für die kollaborative ToDo-PWA. Realisiert
mit **PHP 8.1+** und **MySQL/MariaDB** — **ohne externe Composer-Abhängigkeiten**
(JWT, .env-Parser und der WebSocket-Server sind selbst implementiert).

---

## 1. Schnellstart

```bash
# 1) Datenbank anlegen (Schema inkl. CREATE DATABASE)
mysql -u root -p < schema.sql

# 2) Konfiguration
cp .env.example .env
#   -> DB-Zugangsdaten, JWT-Secrets und ALLOWED_ORIGIN anpassen!
#   Secret erzeugen:  php -r "echo bin2hex(random_bytes(32));"

# 3) REST-API starten (Entwicklung)
php -S 0.0.0.0:8085 -t public      #  http://127.0.0.1:8085

# 4) WebSocket-Server starten (zweites Terminal)
php bin/ws-server.php               #  ws://localhost:8090
```

Healthcheck: `GET http://127.0.0.1:8085/health` → `{"status":"ok"}`.

---

## 2. Projektstruktur

```
backend/
├── public/
│   ├── index.php          # Front Controller (Einstiegspunkt aller HTTP-Requests)
│   └── .htaccess          # Apache-Rewrite auf index.php
├── bin/
│   └── ws-server.php      # Einstiegspunkt WebSocket-Server (CLI, dauerhaft)
├── src/
│   ├── bootstrap.php      # Autoloader, .env, Error->Exception
│   ├── config/            # Env, Database (PDO Pooling + Reconnect), Cors
│   ├── lib/               # Jwt, Validator, Response, HttpException, Request, Emitter, Policy
│   ├── middleware/        # AuthMiddleware, ErrorHandler, RateLimiter, SecurityHeaders
│   ├── models/            # User, RefreshToken, Task, Team, Comment, ShareLink, AuditLog
│   ├── controllers/       # Auth, User, Task, Share, Comment, Team, Audit
│   ├── routes/            # Router + api.php (alle Routen)
│   └── sockets/           # WebSocketServer (RFC 6455, abhängigkeitsfrei)
├── schema.sql             # Komplettes DB-Schema
├── .env.example
└── composer.json          # optional (PSR-4 + Scripts), keine Pflichtabhängigkeiten
```

---

## 3. API-Überblick

Alle geschützten Routen erwarten den Header `Authorization: Bearer <accessToken>`.
Fehler kommen einheitlich als `{ "error": "...", "code": "..." }`.

| Methode | Pfad | Auth | Zweck |
|--------:|------|:----:|-------|
| POST | `/api/auth/register` | – | Registrierung, gibt `accessToken` + `refreshToken` |
| POST | `/api/auth/login` | – | Login |
| POST | `/api/auth/refresh` | – | Access-Token erneuern (Token-Rotation) |
| POST | `/api/auth/logout` | – | Refresh-Token invalidieren |
| GET | `/api/users/me` | ✓ | Eigenes Profil |
| PATCH | `/api/users/me` | ✓ | Profil aktualisieren |
| GET | `/api/tasks` | ✓ | Eigene + zugewiesene + Team-Aufgaben |
| POST | `/api/tasks` | ✓ | Aufgabe erstellen |
| GET | `/api/tasks/:id` | ✓ | Einzelaufgabe |
| PATCH | `/api/tasks/:id` | ✓ | Aufgabe aktualisieren |
| DELETE | `/api/tasks/:id` | ✓ | Aufgabe löschen (nur Ersteller) |
| PATCH | `/api/tasks/:id/assign` | ✓ | Nutzer zuweisen |
| PATCH | `/api/tasks/:id/unassign` | ✓ | Zuweisung entfernen |
| POST | `/api/tasks/:id/share` | ✓ | Share-Link erstellen (`view`/`edit`, Ablauf) |
| DELETE | `/api/tasks/:id/share` | ✓ | Share-Link deaktivieren |
| GET | `/api/share/:token` | – | **Öffentlicher** Aufgabenabruf per Token |
| GET | `/api/tasks/:id/comments` | ✓ | Kommentare auflisten |
| POST | `/api/tasks/:id/comments` | ✓ | Kommentar hinzufügen |
| DELETE | `/api/tasks/:id/comments/:commentId` | ✓ | Kommentar löschen (nur Verfasser) |
| POST | `/api/teams` | ✓ | Team erstellen |
| GET | `/api/teams/:id` | ✓ | Team + Mitglieder |
| POST | `/api/teams/:id/invite` | ✓ | Mitglied per E-Mail einladen |
| GET | `/api/tasks/:id/audit` | ✓ | Audit-Trail einer Aufgabe |

Eine vollständige, klickbare Referenz liegt als **`API-Referenz.html`** im
Projektordner (Beispiel-Requests/-Responses je Endpunkt).

---

## 4. Frontend-Integration (PWA)

### 4.1 JWT bei REST-Requests

Nach Login/Registrierung speichert die PWA das Token-Paar (Access kurzlebig im
Speicher/`localStorage`, Refresh möglichst in einem `HttpOnly`-Cookie oder
`localStorage`). Ein zentraler `fetch`-Wrapper hängt den Access-Token an und
erneuert ihn bei `401` automatisch über `/api/auth/refresh`:

```js
// api.js — zentraler API-Client der PWA
const API = 'http://127.0.0.1:8085';
let accessToken  = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');

async function apiFetch(path, options = {}) {
  const opts = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  };

  let res = await fetch(API + path, opts);

  // Access-Token abgelaufen -> einmal refreshen und Request wiederholen.
  if (res.status === 401 && refreshToken) {
    const r = await fetch(API + '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (r.ok) {
      const data = await r.json();
      accessToken  = data.accessToken;
      refreshToken = data.refreshToken;            // Rotation: neues Refresh-Token speichern!
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      opts.headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(API + path, opts);         // Original-Request wiederholen
    } else {
      // Refresh ungültig -> ausloggen.
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw new Error('Sitzung abgelaufen, bitte erneut anmelden.');
    }
  }

  if (!res.ok) throw await res.json();             // { error, code }
  return res.status === 204 ? null : res.json();
}

// Beispiel:
const { tasks } = await apiFetch('/api/tasks');
await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Hausaufgabe' }) });
```

> **Wichtig:** Bei jedem erfolgreichen `/api/auth/refresh` wird das alte
> Refresh-Token serverseitig widerrufen (Rotation). Immer das **neue** Paar
> speichern, sonst schlägt der nächste Refresh fehl.

### 4.2 Socket.io-Ersatz: nativer WebSocket-Handshake

Der WebSocket-Server ist standardkonform (RFC 6455) und nutzt das native
`WebSocket`-API des Browsers — **keine socket.io-Bibliothek nötig**. Der
Access-Token wird (wie bei socket.io `auth.token`) im Handshake übergeben, hier
als Query-Parameter:

```js
// realtime.js — Echtzeit-Anbindung der PWA
function connectRealtime(onEvent) {
  const WS = 'ws://localhost:8090';
  const token = localStorage.getItem('accessToken');
  const ws = new WebSocket(`${WS}/?token=${encodeURIComponent(token)}`);

  ws.addEventListener('open',  () => console.log('Echtzeit verbunden'));
  ws.addEventListener('message', (e) => {
    const { event, payload } = JSON.parse(e.data);
    // event ∈ task:created | task:updated | task:deleted |
    //          comment:added | comment:deleted | user:assigned | team:member_added
    onEvent(event, payload);
  });

  // Re-Connect bei Verbindungsabbruch.
  ws.addEventListener('close', () => setTimeout(() => connectRealtime(onEvent), 2000));
  return ws;
}

// Verwendung — die PWA aktualisiert ihren State live:
connectRealtime((event, payload) => {
  switch (event) {
    case 'task:created':  store.addTask(payload.task);                 break;
    case 'task:updated':  store.updateTask(payload.task);              break;
    case 'task:deleted':  store.removeTask(payload.taskId);            break;
    case 'comment:added': store.addComment(payload.taskId, payload.comment); break;
    case 'user:assigned': notify(`Neue Aufgabe: ${payload.title}`);    break;
  }
});
```

**Server-seitig** läuft die Echtzeit so:
1. Nutzer verbindet sich → der Server verifiziert den JWT im Handshake.
2. Der Socket tritt automatisch `user:<id>` und allen `team:<id>`-Rooms bei.
3. REST-Controller schreiben Ereignisse in die `events`-Tabelle.
4. Der WebSocket-Server pollt diese Tabelle und broadcastet an die passenden Rooms.

> Dieser DB-Brücken-Ansatz (`events`-Tabelle) entkoppelt den zustandslosen
> PHP-FPM-Prozess vom langlebigen WebSocket-Prozess — in Node würde man dafür
> denselben Prozess oder Redis-PubSub nutzen. Für größere Lasten kann der
> Polling-Mechanismus 1:1 gegen Redis/`LISTEN-NOTIFY` ausgetauscht werden.

---

## 5. Produktionshinweise

- **Secrets:** `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` mit ≥ 32 Byte Zufall setzen.
- **CORS:** `ALLOWED_ORIGIN` exakt auf die PWA-Origin setzen (kein `*` mit Credentials).
- **HTTPS/WSS:** hinter einem Reverse Proxy (nginx) TLS terminieren; `ws://` → `wss://`.
- **Rate Limiting:** Auth-Endpunkte sind limitiert (`RATE_LIMIT_AUTH_*`). Backend
  `file` (Default) oder `db`.
- **Security-Header:** via `SecurityHeaders` (Helmet-Äquivalent) automatisch gesetzt.
- **Prozess-Manager:** `bin/ws-server.php` mit systemd/supervisor überwachen
  (Auto-Restart). Die DB-Verbindung reconnectet bei „MySQL gone away“ selbst.
- **Aufräumen (optional):** abgelaufene `refresh_tokens` / verarbeitete `events`
  per Cron periodisch löschen.
```sql
DELETE FROM refresh_tokens WHERE expires_at < NOW();
DELETE FROM events WHERE created_at < (NOW() - INTERVAL 1 HOUR);
```
