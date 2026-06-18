# ✅ TODO — ToDo-Schule

Estado actual: **app funcional en local (XAMPP/Docker)**, optimizada y lista para subir.
Destino: **hosting compartido** (solo Apache + PHP, sin SSH/daemons).

---

## ✅ App — Funcionalidades implementadas

### Módulo principal
- [x] Autenticación JWT (login, refresh, logout, reset password)
- [x] Perfil de usuario: foto (HEIC soportado, **carga lazy de heic2any**), nombre, contraseña
- [x] **Abmelden** — cierre de sesión en el modal de perfil
- [x] Sesión persistente (refresh no devuelve al login)
- [x] Modo claro/oscuro (toggle + sigue preferencia del sistema)
- [x] Bienvenida según hora del día

### Aufgaben (Tareas)
- [x] CRUD completo con prioridades, fechas, asignaciones, equipos
- [x] Vista lista, tablero Kanban, calendario, Vollbild
- [x] Subtareas, etiquetas, recordatorios, tareas recurrentes
- [x] Comentarios, adjuntos por tarea
- [x] Audit trail (escritura del log; sin UI de lectura)
- [x] Share links (tareas públicas por token)
- [x] Exportar calendario iCal (.ics)

### Notizen (Notas)
- [x] Markdown con checklists clicables
- [x] Privadas o compartidas con equipo
- [x] Bugs-Checkliste (botón "Bugs" en topbar) con guardado optimista

### Klasse
- [x] **Klassenliste** — checklist cooperativa: columnas ✓/📅/🔢, drag & drop de columnas, búsqueda de alumnos, fila verde al completar, toggle de fila, persistencia en DB
- [x] **Schüler·in-Profil** — panel lateral con progreso cross-list
- [x] **Elternkontakt-Log** — historial de contactos por alumno/a (📞 Email Persönlich Schriftlich + nota)
- [x] **Kontaktliste 5d** — datos de contacto: nombre madre/padre, **múltiples teléfonos editables**, dirección, Sonstiges; modal de edición; búsqueda
- [x] Exportar PDF/Word, compartir por chat/email

### Kalender & Benachrichtigungen
- [x] **Kalender 📅** — vista mensual de tareas con puntos de color
- [x] **Benachrichtigungen 🔔** — centro de notificaciones (filtro, agrupar por día, auto-refresh)

### Chat
- [x] Canal grupal + mensajes directos (DM)
- [x] „schreibt…", lesebestätigungen, editar/borrar, adjuntos
- [x] Emoji-Reaktionen, @Erwähnungen, responder/citar, anpinnen
- [x] Búsqueda en chat
- [ ] ⚠️ **Tiempo real solo con WebSocket** — en hosting compartido los mensajes llegan al recargar (ver nota de despliegue)

### Navegación / PWA
- [x] **Secciones reordenables por drag & drop** (Klasse / Aufgaben / Kollegium / Bereiche), orden en localStorage
- [x] **Bottom Navigation (móvil ≤768px)** — clicable vía bridge `ESG_SS`
- [x] **Offline-first** — Outbox en IndexedDB + Background Sync
- [x] **Web Push (VAPID)** — notificaciones push
- [x] **DSGVO** — exportar datos (JSON) + eliminar cuenta
- [x] **Backups automáticos** SQLite con retención
- [x] a11y (ARIA, foco visible, skip-link, reduced-motion)
- [x] Botón PWA „App installieren"
- [x] SQLite (portátil, sin proceso servidor)
- [x] **manifest completo** (iconos 192/512/maskable, standalone, theme)
- [x] **Service Worker** con precache verificado

### 🧹 Limpieza realizada (optimización)
- [x] heic2any (1.3 MB) → carga lazy solo al subir avatar HEIC
- [x] Eliminados módulos muertos: palette, search, activity, admin, shell, call
- [x] Eliminada videollamada WebRTC (frontend + backend `callSignal`)
- [x] Eliminado Klassenbuch (frontend + backend)
- [x] Backend: borrados controllers Search/Activity/Admin/Klassenbuch/Audit
- [x] Schema: agregada tabla `elternkontakte` faltante
- [x] Service Worker limpio (sin referencias muertas, precache válido)

---

## 🚀 Despliegue en hosting compartido — PASOS

> Config: `app/config.js` → `DEPLOY_MODE = "shared"` (ya configurado).
> Limitación: **sin WebSocket** → chat y presencia se actualizan al recargar.
> Tareas, notas, listas, login, push: funcionan al 100%.

- [ ] **1. Subdominio** — crear `todo.tu-escuela.de` apuntando a la carpeta de la app (recomendado sobre subdirectorio)
- [ ] **2. HTTPS** — activar SSL en el panel del hosting (Let's Encrypt / AutoSSL). **Obligatorio** para PWA + Push
- [ ] **3. Subir archivos** — todo el repo vía FTP/SFTP/Git, con `.htaccess` raíz incluido
- [ ] **4. PHP 8.1+** — seleccionar en el panel; extensiones `pdo_sqlite`, `mbstring`, `openssl`
- [ ] **5. `.htaccess` de `backend/public/`** — confirmar que `AllowOverride All` esté activo (la mayoría de hosts lo permiten)
- [ ] **6. Crear `backend/.env`** (nunca commitear):
  - [ ] `APP_DEBUG=false`
  - [ ] `ALLOWED_ORIGIN=https://todo.tu-escuela.de`
  - [ ] `DB_DRIVER=sqlite` + `DB_PATH=` (ruta absoluta a `backend/database.sqlite`)
  - [ ] `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` (`php -r "echo bin2hex(random_bytes(32));"`)
- [ ] **7. Inicializar DB** — `sqlite3 backend/database.sqlite < backend/schema.sqlite.sql` (vía SSH si hay, o phpMyAdmin-SQLite/Adminer del panel)
- [ ] **8. Permisos de escritura** (chmod 775 vía FTP o panel):
  - [ ] `backend/database.sqlite` (+ `-wal`, `-shm`)
  - [ ] `backend/public/avatars/`, `backend/public/chat-files/`, `backend/uploads/`, `backend/storage/`
- [ ] **9. VAPID (push)** — generar `backend/storage/vapid.json` (ver DEPLOY.md §8), pegar `VAPID_PUBLIC_KEY` en `.env`
- [ ] **10. Cron (panel del hosting)**:
  - [ ] Backup diario: `php /ruta/backend/bin/backup.php --keep=30`
  - [ ] Recordatorios: `php /ruta/backend/cron-reminders.php` (cada minuto o cada 5 min)
- [ ] **11. Primer usuario** — `POST /api/auth/register` o insertar en SQLite (ver DEPLOY.md §9)

## 🟡 Verificación post-despliegue

- [ ] `https://todo.tu-escuela.de/` carga la app (`.htaccess` sirve ToDo-Schule.html)
- [ ] Login funciona (API alcanzable en `/backend/public/api/...`)
- [ ] `https://todo.tu-escuela.de/backend/database.sqlite` → **403** (protegido por `.htaccess`)
- [ ] Lighthouse PWA en verde, botón "Instalar" aparece
- [ ] SW sin errores en DevTools → Application → Service Workers
- [ ] Push llega con app en segundo plano
- [ ] Offline: cerrar red → app-shell y datos cargan desde caché

---

## 💡 Ideas futuras

- [ ] **Polling de respaldo para chat** — sin WS, recargar mensajes cada X seg (haría el chat usable en hosting compartido)
- [ ] manifest: maskable-192 + screenshots (mejora UI de instalación en Android)
- [ ] Más clases en Klassenliste (6a, 7b…) con gestión por año escolar
- [ ] Historial de cambios por fila en la Klassenliste
- [ ] App nativa (wrapper Capacitor) para push más fiable en iOS
