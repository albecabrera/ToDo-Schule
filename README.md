# ToDo-Schule 📋

Kollaborative **Aufgaben-, Notizen- und Planungs-PWA** für das Kollegium der
Elisabeth-Selbert-Gesamtschule (Bonn-Bad Godesberg). Lehrkräfte teilen
Aufgaben, Unterrichtsplanungen und Notizen in Echtzeit — installierbar als App,
offline-fähig, mit System-Benachrichtigungen.

---

## Features

| Bereich | Was es kann |
|---------|-------------|
| **Aufgaben** | CRUD, Prioritäten, Fälligkeit, Zuweisungen, Teams, Listen-/Board-Ansicht, Audit-Trail, Share-Links |
| **Notizen & Planungen** | Apuntes/Unterrichtsplanungen erstellen, privat halten oder mit einem Team teilen; Live-Sync bei allen Kolleg:innen |
| **Chat (premium)** | Gruppen- **und** Direktnachrichten in Echtzeit. Datei-/Sprachnachrichten, Bearbeiten/Löschen, „schreibt…", Lesebestätigungen (DM ✓✓ und Gruppe „gelesen von N"), Emoji-Reaktionen, @Erwähnungen (mit Push), Antworten/Zitieren, Suche (im Thread + global), angepinnte Nachrichten, „zuletzt aktiv". Details: `ROADMAP-CHAT.md` |
| **📹 Videoanruf** | 1:1 Video/Audio per **WebRTC** (P2P-Medien, STUN). Signalisierung über die WS-Brücke; Anruf-Overlay mit Bild-in-Bild und Steuerung |
| **Markdown-Checklisten** | `- [ ] offen` / `- [x] erledigt` direkt in Notizen; Checkboxen sind in der Kartenansicht klickbar, Fortschritt (`✓ 2/5`) wird angezeigt |
| **News-Button** | Roter ⚡-Button in der Topbar: Schnellnotiz/Checkliste von überall anlegen |
| **Echtzeit** | WebSocket-Server pusht `task:*` und `note:*`-Events an alle Beteiligten (Auto-Reconnect) |
| **Push-Notifications** | Service Worker zeigt System-Benachrichtigungen (neue Zuweisung, geteilte Notiz, Kommentar) |
| **Lehrer-Login** | Anmeldung per **Kürzel** (`ca` für Cabrera, `ve` für Venedey); Erstpasswort = Nachname, danach erzwungener Passwortwechsel |
| **Begrüßung** | Tageszeitabhängig (Guten Morgen/Tag/Abend); ab 23 Uhr: „Schlafenszeit 🌙 Du brauchst Erholung!" |
| **Hell/Dunkel** | Toggle in der Topbar (🌙/☀️), folgt der System-Präferenz, wird gespeichert |
| **PWA** | Installierbar auf Handy/Tablet/Desktop (Manifest + PNG-Icons 192/512/maskable + apple-touch-icon), Offline-Cache (App-Shell), schneller Start durch vorkompiliertes Bundle. API-/WS-Adressen erkennen Umgebung automatisch (`app/config.js`) — derselbe Build läuft lokal **und** auf dem Server. Server-Deployment: siehe `DEPLOY.md` |
| **Demo-Modus** | „Ohne Login starten" → Mock-Daten, kein Backend nötig |

---

## Tech-Stack

**Frontend**
- **React 18** (UMD, production build, self-hosted in `vendor/` — kein CDN-Roundtrip)
- **Vanilla JSX** ohne Framework-Tooling: Module unter `app/`, vorkompiliert mit **esbuild** → `dist/app.min.js` (~88 KB statt ~2 MB Babel-Runtime)
- **CSS Design System**: Custom Properties (`app/tokens.css`), Dark Mode via `data-theme`, Dichte/Akzentfarben umschaltbar
- **Service Worker** (`sw.js`): Precache der App-Shell, stale-while-revalidate für Assets, network-first für Navigation, Push-Handler

**Backend** (`backend/`)
- **PHP 8.1+, ohne Composer-Abhängigkeiten** — JWT (HS256), .env-Parser, Validator, Router, WebSocket-Server (RFC 6455) sind selbst implementiert
- **MySQL/MariaDB** (PDO, persistente Verbindungen, Auto-Reconnect)
- **JWT-Auth** mit Access-/Refresh-Token-Rotation (Refresh nur als SHA-256-Hash in DB)
- **Echtzeit-Brücke**: REST-Controller schreiben Events in die `events`-Tabelle; der WebSocket-Prozess pollt sie und broadcastet an Rooms (`user:<id>`, `team:<id>`)
- Rate-Limiting, CORS, Security-Header, Audit-Log

---

## Schnellstart

```bash
# 1) Datenbank (XAMPP/Docker-MariaDB oder lokales MySQL)
mysql -u root -p < backend/schema.sql
#    Docker (XAMPP-Container):
#    docker exec -i xampp-mariadb mariadb -u root < backend/schema.sql

# 2) Backend konfigurieren
cd backend
cp .env.example .env          # DB-Zugang, JWT-Secrets, ALLOWED_ORIGIN anpassen
php -r "echo bin2hex(random_bytes(32));"   # Secret generieren

# 3) Lehrer-Konten anlegen (Kürzel:Name)
php bin/seed-teachers.php "ca:Alberto Cabrera" "ve:Venedey"
#    → Login 'ca', Erstpasswort 'Cabrera'

# 4) Server starten (zwei Terminals)
php -S 0.0.0.0:8085 -t public      # REST-API   → http://127.0.0.1:8085
php bin/ws-server.php               # WebSocket  → ws://localhost:8090

# 5) Frontend bauen & servieren
cd ..
./build.sh                          # JSX → dist/app.min.js
python3 -m http.server 5500         # → http://localhost:5500/ToDo-Schule.html
```

> **Wichtig:** Die PWA-Origin muss mit `ALLOWED_ORIGIN` in der `.env`
> übereinstimmen (Standard: `http://localhost:5500`). Service Worker
> funktionieren nur über `http(s)://`, nicht über `file://`.

---

## Projektstruktur

```
ToDo-Schule/
├── ToDo-Schule.html      # Produktion: React prod + dist/app.min.js (kein Babel)
├── dev.html              # Entwicklung: einzelne JSX-Module + Babel im Browser
├── build.sh              # esbuild-Build (./build.sh --watch für Auto-Rebuild)
├── manifest.webmanifest  # PWA-Manifest (PNG-Icons, installierbar)
├── sw.js                 # Service Worker: Offline-Cache + Push (Cache v7)
├── DEPLOY.md             # PWA-Checkliste + Server-Setup (nginx, HTTPS, WS-Daemon, .env)
├── dist/app.min.js       # kompiliertes Bundle (generiert)
├── vendor/               # React 18 production UMD (self-hosted)
├── assets/icons/         # PWA-Icons (192/512/maskable/apple-touch/favicon, aus SVG generiert)
├── app/
│   ├── config.js         # Runtime-Config: API-/WS-Adressen (lokal vs. Server, ohne Build)
│   ├── data.js           # Mock-Daten (Demo-Modus) + ESG_API (REST-Client, mapTask/mapNote)
│   ├── app.jsx           # Root: State, WebSocket, Begrüßung, Passwort-Modal, SW-Registrierung
│   ├── login.jsx         # Login (Kürzel/E-Mail), Registrierung, Demo-Modus
│   ├── shell.jsx         # Sidebar + Topbar (News-Button, Theme-Toggle)
│   ├── notes.jsx         # Notizen & Planungen: Karten, Editor, Markdown-Checklisten
│   ├── notes.css         # Stile für Notizen + roter News-Button
│   ├── taskviews.jsx     # Listen-/Board-Ansicht
│   ├── drawer.jsx        # Aufgaben-Detail
│   ├── overlays.jsx      # Modals, Notifications, Toasts
│   └── *.css             # Design-Tokens, Komponenten, Screens, Responsive
└── backend/              # PHP-REST-API + WebSocket-Server (eigenes README)
    ├── bin/seed-teachers.php   # Lehrer-Konten: Kürzel + Erstpasswort = Nachname
    ├── bin/ws-server.php       # WebSocket-Server (ws://localhost:8090)
    ├── schema.sql              # Komplettes DB-Schema (inkl. notes, users.abbreviation)
    └── src/                    # Controller, Models, Router, Jwt, WebSocketServer …
```

---

## Architektur-Entscheidungen

1. **Build statt Runtime-Transpilation.** Vorher lud die Seite Babel
   (~2 MB) und transpilierte 10 JSX-Dateien bei *jedem* Seitenaufruf.
   Jetzt kompiliert `build.sh` einmalig → ~88 KB minifiziertes Bundle.
   Entwicklung weiterhin ohne Build über `dev.html` möglich.

2. **Events-Tabelle als Realtime-Brücke.** PHP-FPM-Prozesse sind zustandslos
   und können nicht direkt an WebSocket-Clients senden. REST schreibt in
   `events`, der langlebige WS-Prozess pollt (1 s) und broadcastet. Bei
   größerer Last 1:1 gegen Redis Pub/Sub austauschbar.

3. **Kürzel-Login mit Erstpasswort-Zwang.** `users.abbreviation` (unique) +
   `must_change_password`-Flag. Das Frontend zeigt nach dem ersten Login ein
   Pflicht-Modal; `PATCH /api/users/me {password}` setzt das Flag zurück.

4. **Offline-Strategie.** App-Shell precached; Assets stale-while-revalidate;
   `/api/`-Requests werden NIE gecacht (Echtzeit-Daten); Navigation
   network-first mit Cache-Fallback.

5. **Umgebungs-Erkennung statt Build-Flags.** `app/config.js` setzt API-/WS-URLs
   anhand des Hostnamens: lokal → `:8085`/`:8090`, Produktion → gleiche Origin
   (`/api`, `wss://…/ws` hinter Reverse-Proxy). Ein Build für beide Umgebungen.

---

## PWA & Server-Deployment

Die App ist **als PWA fertig** (Manifest, PNG-Icons, Service Worker,
Umgebungs-Config). Lokal über `http://localhost:5500` installierbar.

Für den Betrieb unter eigener Domain fehlt nur **Server-Infrastruktur**
(kein App-Code): HTTPS, nginx-Reverse-Proxy, die zwei PHP-Prozesse, `.env`.

- **Vollständige Anleitung:** `DEPLOY.md` (nginx, Let's Encrypt, systemd, `.env`)
- **Offene Schritte als Checkliste:** `TODO.md`

---

## API-Kurzreferenz

Vollständige Referenz: `backend/API-Referenz.html` · Backend-Details: `backend/README.md`

| Methode | Pfad | Zweck |
|--------:|------|-------|
| POST | `/api/auth/login` | Login per `{abbreviation, password}` oder `{email, password}` |
| PATCH | `/api/users/me` | Profil/Passwort ändern (`{password}` hebt Erstpasswort-Zwang auf) |
| GET/POST | `/api/tasks` | Aufgaben listen/erstellen (inkl. `tags`, `subtasks`, `remindAt`) |
| PATCH/DELETE | `/api/tasks/:id` | Aufgabe ändern/löschen |
| GET/POST | `/api/notes` | Notizen & Planungen listen/erstellen (`?kind=note\|plan`) |
| PATCH/DELETE | `/api/notes/:id` | Notiz ändern (auch Checklisten-Toggle)/löschen |
| GET | `/api/notifications` | Benachrichtigungen abrufen |
| PATCH | `/api/notifications/:id` | Als gelesen markieren |
| GET/POST | `/api/chat` | Chatverlauf abrufen / Nachricht senden |
| WS | `ws://localhost:8090/?token=…` | Echtzeit: `task:*`, `note:*`, `comment:added`, `user:assigned`, `chat:message` |

---

## Entwicklung

```bash
./build.sh --watch        # Auto-Rebuild bei Änderungen (braucht fswatch)
open http://localhost:5500/dev.html   # oder: ohne Build-Schritt entwickeln
```

**Test-Konten** (lokal, nach Seed): `ca` / `Cabrera` · `ve` / `Venedey`

---

## Datenbankmigrationen

Nach dem initialen `schema.sql` folgende Spalten manuell ergänzen (einmalig):

```sql
ALTER TABLE tasks
  ADD COLUMN remind_at DATETIME  NULL AFTER due_date,
  ADD COLUMN subtasks  LONGTEXT  NULL AFTER description,
  ADD COLUMN tags      TEXT      NULL AFTER subtasks;

CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  content    TEXT            NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(32)     NOT NULL,
  actor_id   BIGINT UNSIGNED NULL,
  task_id    BIGINT UNSIGNED NULL,
  text       TEXT            NOT NULL,
  is_read    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
# ToDo-Schule
