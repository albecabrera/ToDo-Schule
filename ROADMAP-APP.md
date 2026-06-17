# 🚀 Roadmap — ToDo-Schule

Historial de mejoras y estado actual. Todos los ítems del roadmap original están implementados.

---

## ✅ Persistencia + PWA

### 1. Offline-first (Outbox + Background Sync) — ✅ HECHO
- Outbox en IndexedDB: encola escrituras (tareas/notas/chat/klasseliste) hechas sin red
- Replay automático al volver la conexión (evento `online` + Background Sync)
- Klasseliste GET cacheado en SW (network-first + fallback)
- Banner „Sin conexión" + contador de pendientes

### 2. Backups automáticos SQLite — ✅ HECHO
- `bin/backup.php`: copia `database.sqlite` con timestamp, retención configurable
- Cron: `0 2 * * * php backend/bin/backup.php --keep=7`

---

## ✅ Funcionalidad

### 3. Tareas recurrentes — ✅ HECHO
- Columna `recurrence` + generación de la siguiente instancia al completar

### 4. Exportar calendario iCal — ✅ HECHO
- Endpoint `.ics` suscribible en Google Calendar/Outlook/Apple Calendar

### 5. Búsqueda global — ✅ HECHO
- `GET /api/search?q=` — tareas + notas + adjuntos (SQLite LIKE)
- Modal overlay `GlobalSearch` activado desde topbar o `⌘K`

---

## ✅ UX

### 6. Command Palette (⌘K) — ✅ HECHO
- Saltar a cualquier tarea, nota, colega o acción vía teclado

### 7. Accesibilidad (a11y) — ✅ HECHO
- ARIA, foco visible, skip-link, `prefers-reduced-motion`, navegación por teclado en modales

### 8. Botón „Instalar app" propio — ✅ HECHO
- Captura `beforeinstallprompt` y muestra chip visible

---

## ✅ Robustez / Cumplimiento

### 9. DSGVO/GDPR — ✅ HECHO
- `GET /api/users/me/export` → JSON completo
- `DELETE /api/users/me` → borrado cascada + archivos físicos

### 10. Feed de Actividad — ✅ HECHO
- Timeline global filtrable por área y usuario, live-update vía WS

---

## ✅ Klasseliste — Checkliste cooperativa (nueva sección)

### 11. Klasseliste básica — ✅ HECHO
- Tabla de 28 alumnos con columnas ✓/📅 configurables
- CRUD completo (crear, editar, borrar lista)
- Exportar PDF, Word, chat, email

### 12. Sincronización en tiempo real — ✅ HECHO
- WS broadcast `klasseliste:updated` → ambos usuarios ven cambios instantáneamente
- Acceso compartido sin filtro por usuario

### 13. 7 Mejoras premium (2026-06-17) — ✅ HECHO

| # | Mejora | Implementación |
|---|--------|---------------|
| 1 | **Presencia en tiempo real** | Heartbeat POST cada 30s → WS broadcast `klasseliste:presence` → barra pulsante verde |
| 2 | **Web Push para Klasseliste** | `KlasselisteController::pushToOthers()` emite `user:<id>` push a todos los demás |
| 3 | **Bottom Navigation (móvil)** | `app/bottom-nav.jsx` → fija en `≤768px`, 4 ítems, oculta sidebar, `window.ESG_SS` |
| 4 | **Resumen semanal por email** | `backend/cron/weekly-digest.php` — HTML email con barras de progreso por columna |
| 5 | **Filtro „Fehlend"** | Toggle en header, filtra `visibleStudents` a los con al menos una casilla vacía |
| 6 | **Offline Klasseliste** | GET cacheado en SW v27, `klasseliste.js` en PRECACHE |
| 7 | **Konfetti al 100%** | Detección en `toggleCheck()` de `wasComplete → isComplete`, 70 partículas CSS |

---

## 💡 Ideas futuras

- Videollamada grupal (3+ participantes)
- Más clases en Klasseliste con gestión por año escolar
- Exportar Klasseliste a PDF desde servidor (sin diálogo de impresión)
- Historial de cambios por fila en la Klasseliste
- App nativa (Capacitor) para push más fiable en iOS
