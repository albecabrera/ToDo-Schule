# 🚀 Roadmap — Mejoras premium de la app

Propuestas para llevar ToDo-Schule al siguiente nivel, con foco en
**funcionalidad, UX, persistencia y PWA**. Ordenadas por valor/esfuerzo.

Estado del chat/llamadas: ver `ROADMAP-CHAT.md` (ya muy completo).

---

## 🗄️ Persistencia + PWA

### 1. Offline-first real (outbox + Background Sync) — 🟢 EN CURSO
La PWA cachea la app (abre sin red) pero hoy **no se puede crear/editar offline**.
- Outbox en **IndexedDB**: encola escrituras (tareas/notas/chat) hechas sin red.
- Replay automático al volver la conexión (evento `online` + **Background Sync**).
- Reconciliación: recarga de datos tras sincronizar (la verdad del servidor reemplaza los temporales).
- UI: banner "Sin conexión" + contador "N ausstehend".
- Archivos: `dist/offline.js`, parches a `apiFetch`, `sw.js` (sync).

### 2. Backups automáticos de la SQLite
- Cron diario que copia `database.sqlite` con timestamp + retención. Un colegio no puede perder el año de planificación.

---

## ⚙️ Funcionalidad

### 3. Tareas recurrentes (Wiederholung)
- Regla de repetición (semanal/mensual: conferencias, guardias, Elternsprechtag).
- Columna `recurrence` + generación de la siguiente instancia al completar.

### 4. Exportar calendario (iCal / .ics)
- Endpoint que genera `.ics` con las tareas con fecha → suscribible en Google Calendar/Outlook del profe.

### 5. Búsqueda global de la app
- Hoy la búsqueda de tareas filtra por título. Falta una que cruce **tareas + notas + adjuntos** (server-side).

---

## ⌨️ UX (buenas prácticas)

### 6. Command Palette (⌘K) — alto impacto
- Buscador único para saltar a cualquier tarea, nota, colega o **acción** ("Neue Aufgabe", "Dunkelmodus", "Vollbild"). Hoy ⌘K solo enfoca el buscador.

### 7. Accesibilidad (a11y) + `prefers-reduced-motion`
- Foco visible, navegación por teclado en modales/drawer, roles ARIA, respeto a "reducir movimiento". En entornos públicos en Alemania es prácticamente exigible (BITV/WCAG).

### 8. Botón "Instalar app" propio
- Capturar `beforeinstallprompt` y mostrar un botón visible → sube la adopción frente al prompt nativo.

---

## 🔒 Robustez / cumplimiento (Alemania)

### 9. DSGVO/GDPR
- Exportar mis datos, borrar cuenta, aviso de privacidad. Datos de profesores = sensibles.

### 10. Auditoría/actividad ampliada
- Ya hay audit-trail; ampliarlo a un feed de actividad por Bereich/usuario.

---

## Prioridad sugerida
1. **Offline-first** (#1) — el mayor salto PWA, persistente. ← en curso
2. **Command Palette** (#6) — UX premium, efecto inmediato.
3. **Tareas recurrentes** (#3) — dolor concreto del día a día.
