# ToDo-Schule 📋

Kollaborative **Aufgaben-, Notizen-, Chat-, Klassenliste- und Kontaktliste-PWA** für das Kollegium der
Elisabeth-Selbert-Gesamtschule (Bonn-Bad Godesberg). Lehrkräfte teilen Aufgaben,
Klassenlisten und Notizen — installierbar als App, offline-fähig, mit
Push-Benachrichtigungen. Echtzeit-Sync (WebSocket) optional, nur auf eigenem Server.

> **Aktuelle Nutzer:** Alberto Cabrera · Loana Venedey  
> **Datenbank:** SQLite (kein MySQL/MariaDB nötig)  
> **Ziel-Deployment:** Shared Hosting (`DEPLOY_MODE = "shared"` in `app/config.js`)  
> **Letztes Update:** 2026-06-18 — Optimierung (heic2any lazy, tote Module entfernt, Videoanruf & Klassenbuch raus), Shared-Hosting-Setup, Nav per Drag & Drop

---

## Features

### Aufgaben & Planung
| Feature | Details |
|---------|---------|
| **Aufgaben** | CRUD, Prioritäten, Fälligkeit, Zuweisungen, Teams, Listen-/Board-Ansicht, Audit-Trail, Share-Links |
| **Wiederholende Aufgaben** | Täglich/Wöchentlich/Monatlich — nächste Instanz wird automatisch bei Abschluss erstellt |
| **Notizen & Planungen** | Markdown-Checklisten (`- [ ]`/`- [x]`), privat oder geteilt |
| **Bugs-Checkliste** | „Bugs"-Knopf in der Topbar — schnelle Mängelliste mit optimistischem Speichern |
| **iCal-Export** | `.ics`-Feed für Google Calendar/Outlook/Apple Calendar abonnierbar |
| **⌘K** | Tastenkürzel fokussiert die Suchleiste der Topbar |

### Klassenliste (Kooperativ)
| Feature | Details |
|---------|---------|
| **Checkliste** | Schülerliste mit ✓/🔢-Spalten, inline umbenennen, Spalten hinzufügen/entfernen |
| **Spaltentypen** | ✓ Checkbox · 🔢 Note (1-6 mit Farbkodierung grün/gelb/rot + Klassendurchschnitt) |
| **Abgabedatum** | Optionales Fälligkeitsdatum pro Spalte — direkt im Header oder via Bearbeiten-Modal (📅 Abgabedatum) |
| **Schüler·in-Profil** | Click auf Namen → Seitenpanel mit Fortschritt quer über alle Listen |
| **Elternkontakt-Log** | Im Profil-Panel: Kontakthistorie pro Schüler·in (📞 E-Mail Persönlich Schriftlich + Notiz) |
| **Spalten per Drag & Drop** | Reihenfolge der Spalten durch Ziehen ändern (sichtbarer Griff ⠿) |
| **Schülersuche & Filter** | Suchfeld filtert Schüler·innen; „Fehlend" zeigt nur offene; ganze Zeile grün bei 100% |
| **Zeilen-Toggle** | Ein Klick markiert/entmarkiert alle Spalten eines Schülers |
| **+ Alle / − Alle** | Ganze Spalte auf einmal markieren / abwählen |
| **Echtzeit-Sync** | Nur mit WebSocket (eigener Server) — auf Shared Hosting nach Neuladen |
| **Offline** | Liste wird aus SW-Cache geladen wenn kein Netz vorhanden |
| **Export** | PDF drucken, Word (.doc), per Chat teilen, per E-Mail |
| **Wöchentlicher Digest** | PHP-Cron schickt jeden Montag 08:00 HTML-E-Mail mit Fortschrittsübersicht |

### Kontaktliste 5d
| Feature | Details |
|---------|---------|
| **Schüler·innen** | Alle 28 Schüler·innen der Klasse 5d mit Name, Eltern, Telefon, Adresse, Sonstiges |
| **Eltern-Daten** | Editier-Modal: Vor-/Nachname von Mutter und Vater, **mehrere Telefonnummern** pro Elternteil (hinzufügen/entfernen) |
| **Anrufen** | Telefonnummern als `tel:`-Links — ein Tap wählt direkt auf dem Smartphone |
| **Warnmarkierung** | Zeilen mit ⚠️ (Allergien, Medikamente) werden orange hervorgehoben |
| **Suche** | Filterbar nach Name, Eltern, Telefon, Adresse oder Sonstiges |
| **Speicherung** | Änderungen in `localStorage` |

### Kalender & Benachrichtigungen
| Feature | Details |
|---------|---------|
| **Kalender 📅** | Monatliche Kalenderansicht aller Aufgaben; farbige Punkte (rot=überfällig, grün=erledigt); Click → Tagesübersicht |
| **Benachrichtigungen 🔔** | Vollständiges Benachrichtigungszentrum mit Verlauf, Filter Alle/Ungelesen, Auto-Refresh 60 s |

### Kommunikation
| Feature | Details |
|---------|---------|
| **Chat** | Gruppen- und Direktnachrichten in Echtzeit, Dateianhänge, Bearbeiten/Löschen |
| **„Schreibt…"** | Tipp-Indikator, Lesebestätigungen (DM ✓✓ / Gruppe „gelesen von N") |
| **Emoji-Reaktionen** | Auf Nachrichten reagieren, @Erwähnungen mit Push |
| **Thread-Suche** | Suche innerhalb einer Unterhaltung |
| **Angepinnte Nachrichten** | Wichtige Nachrichten im Kanal anpinnen |

### Navigation & System
| Feature | Details |
|---------|---------|
| **Sektionen per Drag & Drop** | Reihenfolge der Sidebar-Bereiche (Klasse / Aufgaben / Kollegium / Bereiche) frei ziehen; gespeichert in `localStorage` |
| **Push-Notifications** | VAPID Web Push (neue Aufgaben, Kommentare, Chat-Erwähnungen, **Klasseliste-Änderungen**) |
| **Bottom Nav (Mobil)** | Feste Navigationsleiste unten auf ≤768px: Aufgaben · Klasse · Chat · Notizen |
| **Offline-First** | Schreibvorgänge werden in IndexedDB eingereiht und nach Rückkehr der Verbindung gesendet |
| **Lazy HEIC** | heic2any (1.3 MB) wird erst beim Hochladen eines HEIC-Avatars geladen |
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
- **Echtzeit-Brücke** (nur eigener Server): REST schreibt Events in `events`-Tabelle; WS-Prozess pollt und broadcastet. Auf Shared Hosting deaktiviert (`DEPLOY_MODE = "shared"`) — die App läuft per REST weiter
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
├── sw.js                     # Service Worker (Cache v29 + Push + Offline-Klasseliste)
├── .htaccess                 # Shared-Hosting: App als Index + Backend-Internals sperren
├── start.sh                  # Schnellstart (lokal): API + WS zusammen starten
├── dist/
│   ├── app.min.js            # Haupt-Bundle (Shell, Tasks, Notes, Login, Kalender…)
│   ├── chat.js               # Chat-Modul
│   ├── klasseliste.js        # Klasseliste-Modul  ← Checkliste + Notensp. + Profil
│   ├── kontaktliste.js       # Kontaktliste 5d
│   ├── calendar.js           # Kalender-Modul (Monatsansicht + Aufgaben-Dots)
│   ├── notifications-center.js # Benachrichtigungszentrum
│   ├── bottom-nav.js         # Mobile Bottom Navigation
│   ├── offline.js            # Offline-Outbox (IndexedDB + Background Sync)
│   └── install.js            # PWA-Installations-Button
├── app/
│   ├── config.js             # Runtime-Config: DEPLOY_MODE (shared/vps) + API-/WS-URLs
│   ├── data.js               # ESG_API (REST-Client, Auth, Token-Verwaltung)
│   ├── app.jsx               # Root: State, WS (optional), Begrüßung, SW-Registrierung
│   ├── shell.jsx             # Sidebar (Drag&Drop) + Topbar + Profil + Abmelden + lazy HEIC
│   ├── klasseliste.jsx       # Klasseliste: Checkboxen, Datum, Note, Profil, Konfetti
│   ├── kontaktliste.jsx      # Kontaktliste 5d (Eltern, Telefone, Edit-Modal)
│   ├── calendar.jsx          # Kalender-Monatsansicht
│   ├── notifications-center.jsx # Benachrichtigungszentrum
│   ├── bottom-nav.jsx        # Bottom Navigation Bar (Mobil)
│   ├── chat.jsx              # Chat-Modul
│   └── *.css / *.jsx         # Weitere Module und Stile
├── backend/
│   ├── database.sqlite       # SQLite-DB (gitignored, lokal vorhanden)
│   ├── public/.htaccess      # Rewrite aller /api-Anfragen → index.php
│   ├── src/
│   │   ├── Controllers/      # Klasseliste, Elternkontakt, Chat, Auth, Task, Note…
│   │   ├── Models/           # Klasse, Elternkontakt, User, AuditLog…
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
| PATCH | `/api/klasselisten/:id` | Checkboxen / Datum / Noten / Spalten aktualisieren |
| POST | `/api/klasselisten/presence` | Präsenz-Heartbeat senden |
| GET/POST | `/api/elternkontakte` | Elternkontakt-Einträge abrufen / erstellen |
| DELETE | `/api/elternkontakte/:id` | Elternkontakt-Eintrag löschen |
| GET | `/api/notifications` | Benachrichtigungen laden |
| PATCH | `/api/notifications/:id` | Einzelne Benachrichtigung als gelesen markieren |
| POST | `/api/notifications/read-all` | Alle als gelesen markieren |
| WS | `wss://<host>/ws?token=…` | Echtzeit (nur eigener Server): `task:*`, `chat:*`, `klasseliste:*` |

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

2. **Esbuild-Module statt Monobundle.** Große Features (Chat, Klasseliste, Kontaktliste) leben in eigenen IIFEs (`window.XyzScreen`), werden als `<script defer>` geladen und beim Render eingehängt. Modul bauen: `cat app/modul.jsx | npx esbuild --loader=jsx --minify --target=es2018 > dist/modul.js`. Haupt-Bundle: alle Kern-Module zusammen durch esbuild pipen (siehe `build.sh` als Referenz — aber Module einzeln bauen, nicht `./build.sh` ausführen).

3. **Events-Tabelle als Realtime-Brücke.** PHP-FPM ist zustandslos; REST schreibt in `events`, der WS-Prozess pollt (1 s) und broadcastet. Bei größerer Last 1:1 gegen Redis Pub/Sub austauschbar.

4. **Kooperative Klasseliste ohne User-Filter.** Alle authentifizierten Nutzer sehen alle Listen. Änderungen werden per WS-Broadcast sofort an alle anderen gesendet; VAPID-Push benachrichtigt offline.

5. **Offline-Strategie.** App-Shell precached; Klasseliste-GET network-first mit Cache-Fallback; Schreibvorgänge über IndexedDB-Outbox + Background Sync.

---

## PWA & Deployment

- **Shared Hosting** (nur Apache + PHP): Schritt-für-Schritt in `TODO.md` → „Despliegue en hosting compartido". `app/config.js` steht auf `DEPLOY_MODE = "shared"`; das mitgelieferte `.htaccess` liefert die App aus und sperrt Backend-Internals. Kein WebSocket → Chat/Präsenz aktualisieren nach Neuladen.
- **Eigener Server / VPS** (nginx + systemd + Echtzeit): vollständige Anleitung in `DEPLOY.md`. Dann `DEPLOY_MODE = "vps"` setzen.

```bash
# VAPID-Schlüssel generieren (einmalig, für Push-Notifications)
php backend/bin/generate-vapid.php
# → Ausgabe in .env einfügen
```
