# 🚀 Roadmap — Mejoras premium de la app

Propuestas para llevar ToDo-Schule al siguiente nivel, con foco en
**funcionalidad, UX, persistencia y PWA**. Ordenadas por valor/esfuerzo.

Estado del chat/llamadas: ver `ROADMAP-CHAT.md` (ya muy completo).

---

## 🗄️ Persistencia + PWA

### 1. Offline-first real (outbox + Background Sync) — ✅ HECHO
La PWA cachea la app (abre sin red) pero hoy **no se puede crear/editar offline**.
- Outbox en **IndexedDB**: encola escrituras (tareas/notas/chat) hechas sin red.
- Replay automático al volver la conexión (evento `online` + **Background Sync**).
- Reconciliación: recarga de datos tras sincronizar (la verdad del servidor reemplaza los temporales).
- UI: banner "Sin conexión" + contador "N ausstehend".
- Archivos: `dist/offline.js`, parches a `apiFetch`, `sw.js` (sync).

### 2. Backups automáticos de la SQLite — ✅ HECHO
- `bin/backup.php`: copia `database.sqlite` con timestamp, retención configurable (`--keep=N` días).
- Cron recomendado: `0 2 * * * php /ruta/bin/backup.php >> /var/log/esg-backup.log`
- Backups en `storage/backups/` (gitignored).

---

## ⚙️ Funcionalidad

### 3. Tareas recurrentes (Wiederholung) — ✅ HECHO
- Regla de repetición (semanal/mensual: conferencias, guardias, Elternsprechtag).
- Columna `recurrence` + generación de la siguiente instancia al completar.

### 4. Exportar calendario (iCal / .ics) — ✅ HECHO
- Endpoint que genera `.ics` con las tareas con fecha → suscribible en Google Calendar/Outlook del profe.

### 5. Búsqueda global de la app — ✅ HECHO
- `GET /api/search?q=` cruza tareas + notas + adjuntos (server-side, SQLite LIKE).
- Frontend: modal overlay `GlobalSearch` (Liquid Glass), activado con Enter en el topbar (≥2 chars) o con `esg:open-search` event.
- Resultados agrupados por tipo con iconos + subtítulo contextual.

---

## ⌨️ UX (buenas prácticas)

### 6. Command Palette (⌘K) — ✅ HECHO
- Buscador único para saltar a cualquier tarea, nota, colega o **acción** ("Neue Aufgabe", "Dunkelmodus", "Vollbild"). Hoy ⌘K solo enfoca el buscador.

### 7. Accesibilidad (a11y) + `prefers-reduced-motion` — ✅ HECHO
- Foco visible, navegación por teclado en modales/drawer, roles ARIA, respeto a "reducir movimiento". En entornos públicos en Alemania es prácticamente exigible (BITV/WCAG).

### 8. Botón "Instalar app" propio — ✅ HECHO
- Capturar `beforeinstallprompt` y mostrar un botón visible → sube la adopción frente al prompt nativo.

---

## 🔒 Robustez / cumplimiento (Alemania)

### 9. DSGVO/GDPR — ✅ HECHO
- `GET /api/users/me/export` → JSON con perfil, tareas, notas, comentarios, mensajes, adjuntos.
- `DELETE /api/users/me` (body `{password}`) → borrado cascada + archivos físicos.
- Frontend: sección "Datenschutz (DSGVO)" en el perfil modal con botones "Daten exportieren" y "Konto löschen".

### 10. Auditoría/actividad ampliada — ✅ HECHO
- `GET /api/activity?team_id=&user_id=&action=&limit=` — feed global filtrable.
- Frontend: sección "Aktivität" en el sidebar, timeline con dot-line, diff-chips (antes → después), filtros por Bereich y Lehrkraft.
- Live-update vía `esg:task-changed` event desde WS.

---

## Prioridad sugerida
1. **Offline-first** (#1) — el mayor salto PWA, persistente. ← en curso
2. **Command Palette** (#6) — UX premium, efecto inmediato.
3. **Tareas recurrentes** (#3) — dolor concreto del día a día.
