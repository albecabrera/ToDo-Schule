# ToDo-Schule 📋

Kollaborative **Aufgaben-, Notizen-, Chat- und Klasseliste-PWA** für das Kollegium der
Elisabeth-Selbert-Gesamtschule (Bonn-Bad Godesberg). Lehrkräfte teilen Aufgaben,
Klasselisten und Notizen in Echtzeit — installierbar als App, offline-fähig,
mit Push-Benachrichtigungen und Echtzeit-Präsenz.

> **Aktuelle Nutzer:** Alberto Cabrera · Loana Venedey  
> **Datenbank:** SQLite (kein MySQL/MariaDB nötig)  
> **Letztes Update:** 2026-06-17

---

## Features

### Aufgaben & Planung
| Feature | Details |
|---------|---------|
| **Aufgaben** | CRUD, Prioritäten, Fälligkeit, Zuweisungen, Teams, Listen-/Board-Ansicht, Audit-Trail, Share-Links |
| **Wiederholende Aufgaben** | Täglich/Wöchentlich/Monatlich — nächste Instanz wird automatisch bei Abschluss erstellt |
| **Notizen & Planungen** | Markdown-Checklisten (`- [ ]`/`- [x]`), privat oder geteilt, Live-Sync |
| **iCal-Export** | `.ics`-Feed für Google Calendar/Outlook/Apple Calendar abonnierbar |
| **Command Palette ⌘K** | Springen zu Aufgabe/Notiz/Kollege/Aktion per Tastatur |

### Klasseliste (Kooperativ)
| Feature | Details |
|---------|---------|
| **Checkliste** | Schülerliste mit ✓/Datum-Spalten, inline umbenennen, Spalten hinzufügen/entfernen |
| **Echtzeit-Sync** | Änderungen von Alberto oder Loana erscheinen sofort bei beiden (WS-Broadcast) |
| **Presencia** | Grüner Pulsindikator „Loana ist gerade aktiv" wenn Kollege die Liste geöffnet hat |
| **Filtro Fehlend** | Zeigt nur Schüler·innen mit mindestens einer offenen Spalte |
| **+ Alle / − Alle** | Ganze Spalte auf einmal markieren / abwählen |
| **Konfetti 🎉** | CSS-Animation + Toast wenn eine Spalte zu 100% abgeschlossen ist |
| **Offline** | Liste wird aus SW-Cache geladen wenn kein Netz vorhanden |
| **Export** | PDF drucken, Word (.doc), per Chat teilen (mit Spaltenauswahl + Empfänger), per E-Mail |
| **Chat-Anhang** | HTML-Anhang öffnet sich als interaktive Liste im Browser |
| **Wöchentlicher Digest** | PHP-Cron schickt jeden Montag 08:00 HTML-E-Mail mit Fortschrittsübersicht |

### Kommunikation
| Feature | Details |
|---------|---------|
| **Chat** | Gruppen- und Direktnachrichten in Echtzeit, Dateianhänge, Bearbeiten/Löschen |
| **„Schreibt…"** | Tipp-Indikator, Lesebestätigungen (DM ✓✓ / Gruppe „gelesen von N") |
| **Emoji-Reaktionen** | Auf Nachrichten reagieren, @Erwähnungen mit Push |
| **Suche** | Thread-Suche + globale App-Suche (Aufgaben + Notizen + Anhänge) |
| **Angepinnte Nachrichten** | Wichtige Nachrichten im Kanal anpinnen |
| **📹 Videoanruf** | 1:1 Video/Audio per WebRTC (P2P, STUN), Signalisierung via WS |

### App & System
| Feature | Details |
|---------|---------|
| **Push-Notifications** | VAPID Web Push (neue Aufgaben, Kommentare, Chat-Erwähnungen, **Klasseliste-Änderungen**) |
| **Bottom Nav (Mobil)** | Feste Navigationsleiste unten auf ≤768px: Aufgaben · Klasse · Chat · Notizen |
| **Offline-First** | Schreibvorgänge werden in IndexedDB eingereiht und nach Rückkehr der Verbindung gesendet |
| **Globale Suche** | Aufgaben + Notizen + Anhänge serverside per SQLite LIKE |
| **Aktivitäts-Feed** | Globale Timeline aller Änderungen, filterbar nach Bereich/Lehrkraft |
| **Admin-Panel** | Benutzerverwaltung (anlegen, deaktivieren, Passwort zurücksetzen) |
| **DSGVO** | Datenexport (JSON) + Kontolöschung mit Passwortbestätigung |
| **Datenschutz-Backups** | `bin/backup.php` + Cron-Job; Retention konfigurierbar |
| **Hell/Dunkel** | Toggle in der Topbar, folgt System-Präferenz |
| **PWA** | Installierbar auf Handy/Tablet/Desktop (Manifest + Icons + SW), Offline-App-Shell |
| **a11y** | ARIA-Rollen, Fokus-Trap in Modalen, `prefers-reduced-motion`, Skip-Link |
| **Abmelden** | „↩ Abmelden"-Knopf im Profil-Modal für Nutzerwechsel |

---

## Tech-Stack

### Frontend
- **React 18 UMD** (production, self-hosted in `vendor/` — kein CDN, kein Babel zur Laufzeit)
- **Vanilla JSX** ohne Framework-Tooling: Module unter `app/`, vorkompiliert mit **esbuild** → `dist/`-Bundles
- **NIEMALS `./build.sh` ausführen** — stattdessen einzelne Module mit `npx esbuild app/modul.jsx ... --outfile=dist/modul.js` bauen
- **CSS Design System**: Custom Properties (`app/tokens.css`), Dark Mode via `data-theme`
- **Service Worker** (`sw.js`): Precache App-Shell, network-first für Navigation und Klasseliste-API, Push-Handler

### Backend
- **PHP 8.1+**, ohne Composer — JWT (HS256), Router, WebSocket-Server (RFC 6455) selbst implementiert
- **SQLite** (PDO) — kein MySQL/MariaDB nötig, portable, kein Server-Prozess
- **Echtzeit-Brücke**: REST schreibt Events in `events`-Tabelle; WS-Prozess pollt und broadcastet
- Rate-Limiting, CORS, Security-Header, Audit-Log, VAPID Web Push

---

## Nutzer (Produktion)

| Name | E-Mail | Passwort |
|------|--------|----------|
| Alberto Cabrera | `alberto.cabrera@esg.nrw.schule` | `Morenito1!` |
| Loana Venedey | `loana.venedey@esg.nrw.schule` | `lehrerinve` |

---

## Schnellstart (lokal)

```bash
# 1) Backend starten (zwei Terminals)
php -S 0.0.0.0:8085 -t backend/public      # REST-API → http://127.0.0.1:8085
php backend/bin/ws-server.php               # WebSocket → ws://localhost:8090

# 2) Frontend servieren (nicht über file://)
python3 -m http.server 5500
# → http://localhost:5500/ToDo-Schule.html

# Die Datenbank (backend/database.sqlite) liegt bereits befüllt im Repo
# (gitignored in Produktion, lokal vorhanden)
```

Oder über XAMPP:
```bash
# Repo in XAMPP htdocs synchronisieren
rsync -a --exclude='.git' --exclude='node_modules' . /pfad/zu/xampp-data/htdocs/esg/
# → http://localhost/esg/ToDo-Schule.html
```

> **Hinweis:** `ALLOWED_ORIGIN` in `backend/.env` muss mit dem Frontend-Origin übereinstimmen.

---

## Projektstruktur

```
ToDo-Schule/
├── ToDo-Schule.html          # Einstiegspunkt (React prod + Bundle, kein Babel)
├── manifest.webmanifest      # PWA-Manifest
├── sw.js                     # Service Worker (Cache v27 + Push + Offline-Klasseliste)
├── start.sh                  # Schnellstart: API + WS zusammen starten
├── dist/
│   ├── app.min.js            # Haupt-Bundle (Shell, Tasks, Notes, Login…)
│   ├── chat.js               # Chat-Modul
│   ├── klasseliste.js        # Klasseliste-Modul  ← kooperative Checkliste
│   ├── bottom-nav.js         # Mobile Bottom Navigation
│   ├── offline.js            # Offline-Outbox (IndexedDB + Background Sync)
│   └── *.js                  # Weitere Module (palette, search, activity, admin…)
├── app/
│   ├── config.js             # Runtime-Config: API-/WS-URLs (lokal vs. Server)
│   ├── data.js               # ESG_API (REST-Client, Auth, Token-Verwaltung)
│   ├── app.jsx               # Root: State, WS, Begrüßung, SW-Registrierung
│   ├── shell.jsx             # Sidebar + Topbar + Profil + Abmelden
│   ├── klasseliste.jsx       # Klasseliste: Checkboxen, Datum, Präsenz, Konfetti
│   ├── bottom-nav.jsx        # Bottom Navigation Bar (Mobil)
│   ├── chat.jsx              # Chat-Modul
│   └── *.css / *.jsx         # Weitere Module und Stile
├── backend/
│   ├── database.sqlite       # SQLite-DB (gitignored, lokal vorhanden)
│   ├── src/
│   │   ├── Controllers/      # KlasselisteController, ChatController, AuthController…
│   │   ├── Models/           # Klasse, User, ChatMessage, PushSubscription…
│   │   ├── Lib/              # Emitter (WS-Brücke + Push), WebPush (VAPID), JWT…
│   │   └── Routes/api.php    # Alle REST-Routen
│   ├── bin/
│   │   ├── ws-server.php     # WebSocket-Server
│   │   ├── backup.php        # Datenbank-Backup (Cron)
│   │   └── generate-vapid.php# VAPID-Schlüssel generieren
│   └── cron/
│       └── weekly-digest.php # Wöchentlicher E-Mail-Bericht (jeden Montag 08:00)
└── assets/icons/             # PWA-Icons (192/512/maskable/apple-touch/favicon)
```

---

## API-Kurzreferenz

| Methode | Pfad | Zweck |
|--------:|------|-------|
| POST | `/api/auth/login` | Login per `{email, password}` |
| PATCH | `/api/users/me` | Profil/Passwort ändern |
| GET/POST | `/api/tasks` | Aufgaben listen/erstellen |
| PATCH/DELETE | `/api/tasks/:id` | Aufgabe ändern/löschen |
| GET/POST | `/api/notes` | Notizen listen/erstellen |
| GET/POST | `/api/chat` | Chatverlauf / Nachricht senden |
| POST | `/api/chat/upload` | Datei-Anhang hochladen |
| GET/POST | `/api/klasselisten` | Listen abrufen / erstellen |
| PATCH | `/api/klasselisten/:id` | Checkboxen / Datum / Spalten aktualisieren |
| POST | `/api/klasselisten/presence` | Präsenz-Heartbeat senden |
| GET | `/api/search?q=` | Globale Suche (Aufgaben + Notizen + Anhänge) |
| GET | `/api/activity` | Aktivitäts-Feed (filterbar) |
| WS | `ws://localhost:8090/?token=…` | Echtzeit: `task:*`, `chat:*`, `klasseliste:*`, `klasseliste:presence` |

---

## Cron-Jobs

```bash
# Wöchentlicher Klasselisten-Bericht (jeden Montag 08:00)
0 8 * * 1 php /pfad/zu/backend/cron/weekly-digest.php >> /var/log/esg-digest.log

# Tägliches Datenbank-Backup (02:00 Uhr, 7 Tage Retention)
0 2 * * * php /pfad/zu/backend/bin/backup.php --keep=7 >> /var/log/esg-backup.log
```

---

## Architektur-Entscheidungen

1. **SQLite statt MySQL.** Portabel, kein Server-Prozess nötig, reicht für das Kollegium einer Schule (< 100 Nutzer, < 10 concurrent). Migration: Schema in `backend/schema.sqlite.sql`.

2. **Esbuild-Module statt Monobundle.** Große Features (Chat, Klasseliste, Admin) leben in eigenen IIFEs (`window.XyzScreen`), werden als `<script defer>` geladen und beim Render eingehängt. Kein kompletter Rebuild nötig; Änderungen am Modul: `npx esbuild app/modul.jsx --loader:.jsx=jsx --minify --outfile=dist/modul.js`.

3. **Events-Tabelle als Realtime-Brücke.** PHP-FPM ist zustandslos; REST schreibt in `events`, der WS-Prozess pollt (1 s) und broadcastet. Bei größerer Last 1:1 gegen Redis Pub/Sub austauschbar.

4. **Kooperative Klasseliste ohne User-Filter.** Alle authentifizierten Nutzer sehen alle Listen. Änderungen werden per WS-Broadcast sofort an alle anderen gesendet; VAPID-Push benachrichtigt offline.

5. **Offline-Strategie.** App-Shell precached; Klasseliste-GET network-first mit Cache-Fallback; Schreibvorgänge über IndexedDB-Outbox + Background Sync.

---

## PWA & Deployment

Vollständige Server-Checkliste: `TODO.md`  
Deployment-Anleitung (nginx, Let's Encrypt, systemd, `.env`): `DEPLOY.md`

```bash
# VAPID-Schlüssel generieren (einmalig, für Push-Notifications)
php backend/bin/generate-vapid.php
# → Ausgabe in .env einfügen
```
