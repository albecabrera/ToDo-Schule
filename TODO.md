# ✅ TODO — ToDo-Schule

Estado actual: **app completamente funcional en local (XAMPP/PHP built-in)**  
Pendiente: infraestructura de servidor para producción pública con HTTPS.

---

## ✅ App — Funcionalidades implementadas

### Módulo principal
- [x] Autenticación JWT (login, refresh, logout, reset password)
- [x] Perfil de usuario: foto (HEIC soportado), nombre, contraseña
- [x] **Abmelden** — botón de cierre de sesión en el modal de perfil
- [x] Modo claro/oscuro (toggle + sigue preferencia del sistema)
- [x] Bienvenida según hora del día (incluyendo „Schlafenszeit 🌙")
- [x] Panel de administración (crear/desactivar usuarios, resetear contraseñas)

### Aufgaben (Tareas)
- [x] CRUD completo con prioridades, fechas, asignaciones, equipos
- [x] Vista lista y tablero Kanban
- [x] Subtareas, etiquetas, recordatorios
- [x] Tareas recurrentes (diaria/semanal/mensual)
- [x] Comentarios con notificaciones en tiempo real
- [x] Adjuntos por tarea
- [x] Audit trail por tarea
- [x] Share links (tareas públicas por token)
- [x] Exportar calendario iCal (.ics) — suscribible en Google/Outlook

### Notizen (Notas)
- [x] Markdown con checklists (`- [ ]`/`- [x]`) clicables
- [x] Privadas o compartidas con equipo
- [x] Live-sync vía WebSocket

### Klasseliste (Checkliste cooperativa) — nuevo
- [x] Tabla de alumnos con columnas ✓/📅 configurables
- [x] Echtzeit-Sync entre Alberto y Loana (WS broadcast)
- [x] **Presencia en tiempo real** — indicador pulsante „Loana ist gerade aktiv"
- [x] **Filtro „Fehlend"** — solo muestra alumnos con entradas pendientes
- [x] **Konfetti 🎉** — animación CSS cuando una columna llega al 100%
- [x] **Offline** — lista cargada desde caché SW cuando no hay red
- [x] + Alle / − Alle (marcar/desmarcar toda una columna)
- [x] Scroll horizontal y vertical en tabla
- [x] Tipo de columna: ✓ Checkbox o 📅 Fecha
- [x] Inline renombrar columnas
- [x] Exportar PDF (imprimir), Word (.doc)
- [x] Compartir por chat (con selección de columnas y destinatario)
- [x] Compartir por email (mailto:)
- [x] Adjunto HTML interactivo en el chat
- [x] CRUD de listas (crear, editar, borrar)
- [x] Crear usuario Loana Venedey (loana.venedey@esg.nrw.schule / lehrerinve)

### Chat
- [x] Canal grupal + mensajes directos (DM)
- [x] Indicador „schreibt…", lesebestätigungen (DM ✓✓ / grupo „gelesen von N")
- [x] Editar/borrar mensajes
- [x] Adjuntos de archivos
- [x] Emoji-Reaktionen, @Erwähnungen
- [x] Respuestas/citar, anpinnen
- [x] Búsqueda en chat + búsqueda global
- [x] „Zuletzt aktiv" por usuario

### Videoanruf
- [x] WebRTC 1:1 (video + audio, P2P con STUN)
- [x] Overlay de llamada con controles y picture-in-picture

### Sistema / PWA
- [x] **Web Push (VAPID)** — notificaciones push (asignaciones, comentarios, chat, **Klasseliste-Änderungen**)
- [x] **Bottom Navigation Bar (móvil ≤768px)** — Aufgaben · Klasse · Chat · Notizen
- [x] **Offline-first** — Outbox en IndexedDB + Background Sync
- [x] **Búsqueda global** — Aufgaben + Notizen + Adjuntos vía SQLite LIKE
- [x] **Feed de actividad** — timeline filtrable por área y usuario
- [x] **DSGVO** — exportar datos (JSON) + eliminar cuenta
- [x] **Backups automáticos** SQLite con retención configurable
- [x] **Resumen semanal** por email (`backend/cron/weekly-digest.php`, lunes 08:00)
- [x] Command Palette ⌘K
- [x] a11y (ARIA, foco visible, skip-link, reduced-motion)
- [x] Botón PWA „App installieren" propio
- [x] SQLite (migrado desde MySQL) — portátil, sin proceso servidor

---

## 🔴 Infraestructura — Sin esto no hay producción pública

- [ ] **Dominio** — apuntar DNS A → IP del VPS
- [ ] **HTTPS** — `sudo certbot --nginx -d dominio.de`

## 🟠 Configuración del servidor

- [ ] **nginx** con:
  - [ ] Frontend estático desde raíz del repo
  - [ ] Proxy `/api/` → PHP en `127.0.0.1:8085`
  - [ ] Proxy `/ws` → WebSocket en `127.0.0.1:8090` (con headers `Upgrade`)
  - [ ] `Cache-Control: no-cache` para `sw.js`
- [ ] **PHP 8.1+** en el servidor
- [ ] **WebSocket como servicio systemd** (`todo-schule-ws.service`)
- [ ] **VAPID generado** — `php backend/bin/generate-vapid.php` → pegar en `.env`
- [ ] **`backend/.env`** en el servidor:
  - [ ] `JWT_SECRET` nuevo (`php -r "echo bin2hex(random_bytes(32));"`)
  - [ ] `SQLITE_PATH` con ruta absoluta
  - [ ] `ALLOWED_ORIGIN=https://dominio.de`
  - [ ] `VAPID_*` (del paso anterior)
- [ ] **Permisos de escritura** para `www-data` en:
  - [ ] `backend/database.sqlite` (+ `-wal`, `-shm`)
  - [ ] `backend/public/avatars/`
  - [ ] `backend/public/chat-files/`
  - [ ] `backend/uploads/`
- [ ] **Crons activados** en el servidor:
  - [ ] `0 8 * * 1 php /ruta/backend/cron/weekly-digest.php >> /var/log/esg-digest.log`
  - [ ] `0 2 * * * php /ruta/backend/bin/backup.php --keep=7 >> /var/log/esg-backup.log`
- [ ] (Opcional) **TURN server** para videollamadas tras NATs estrictos

## 🟡 Verificación final

- [ ] `https://dominio.de/ToDo-Schule.html` carga correctamente
- [ ] Lighthouse PWA: todo en verde
- [ ] Login funciona (API alcanzable vía HTTPS)
- [ ] Chat y Klasseliste en tiempo real funcionan (WS vía `wss://`)
- [ ] Push notifications llegan con app en segundo plano
- [ ] Offline: cerrar datos → app-shell y lista cargan desde caché

---

## 💡 Ideas futuras (sin prioridad fijada)

- [ ] Videollamada grupal (3+ participantes)
- [ ] Más clases en Klasseliste (6a, 7b, etc.) con gestión por año escolar
- [ ] Exportar Klasseliste directamente a PDF desde el servidor (sin diálogo de impresión)
- [ ] Historial de cambios por fila en la Klasseliste
- [ ] App nativa (wrapper Capacitor/Tauri) para notificaciones más fiables en iOS
