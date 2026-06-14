# 💬 Roadmap — Comunicación en tiempo real (Chat premium)

Estado de las funciones de chat/colaboración en vivo. Sirve de referencia para
seguir construyendo. Stack: WS-Bridge por tabla `events` (poll ~1s) → eventos
`esg:chat:*` despachados desde `dist/app.min.js` y escuchados en `dist/chat.js`.

---

## ✅ Hecho

| Función | Cómo funciona | Archivos clave |
|---------|---------------|----------------|
| **Chat grupal + DM** | `recipient_id` NULL = Kollegium, int = DM | `ChatController`, `ChatMessage`, `dist/chat.js` |
| **Adjuntos** | `POST /api/chat/upload` → `chat-files/` | `ChatController::uploadFile` |
| **Editar / borrar** | `PATCH`/`DELETE /api/chat/:id` (solo autor) | idem |
| **Typing** ("schreibt…") | `POST /api/chat/typing` (throttle 2.5s) → WS `chat:typing` → se borra a los 4s | `ChatController::typing` |
| **Read receipts** (✓/✓✓) | Solo DM. `GET /api/chat?to=` marca leído + emite `chat:read`; tabla `chat_reads(user_id,peer_id,last_read_id)` | `ChatController::index/read`, `ChatMessage::markRead/lastReadBy` |
| **Reacciones emoji** | `POST /api/chat/:id/react` (toggle) → tabla `chat_reactions` → WS `chat:reaction` | `ChatController::react`, `ChatMessage::toggle/reactionsFor` |
| **🎤 Mensajes de voz** | `MediaRecorder` (audio/webm) → sube por `/api/chat/upload` → adjunto de audio; reproductor `<audio>` inline. Sin cambios de backend (reutiliza adjuntos). Requiere HTTPS/localhost para el micrófono | `dist/chat.js` (MessagePane: startRec/stopRec, ChatAttachment: isAudioFile) |
| **@Menciones** | Autocompletar al escribir `@`; al enviar va `mentions:[ids]`; backend emite `chat:mention` (+push) al mencionado aunque no esté en el hilo; resaltado en la burbuja | `ChatController::store`, `dist/chat.js` (renderMentions, pickMention, deriveMentions), WS case `chat:mention` en `app.min.js` |
| **Responder / citar** | Columna `reply_to_id`; botón "Antworten" → barra de cita sobre el composer → al enviar va `reply_to`; la burbuja muestra el bloque citado (nombre + snippet) | `ChatMessage` (JOIN al padre), `ChatController::store`, `dist/chat.js` (replyTarget, chat-quote/chat-reply-bar) |
| **Buscar en el chat** | Lupa en el header del hilo → filtra los mensajes del hilo (cliente) y resalta coincidencias | `dist/chat.js` (highlightText, query) |
| **Fijar mensajes** | Columna `pinned`; acción 📌 al hover → `POST /api/chat/:id/pin` (toggle) → WS `chat:pinned`; barra de fijados arriba del hilo | `ChatMessage::togglePin`, `ChatController::pin`, `dist/chat.js` (chat-pinned-bar) |
| **📹 Videollamada 1:1 (WebRTC)** | Señalización por el WS bridge (`/api/chat/call/signal` → `call:signal`), media P2P (STUN Google); botón 📹 en header DM, overlay con PiP + controles (mic/cámara/colgar) | `ChatController::callSignal`, `dist/call.js` (CallManager), `app/call.css` |
| **Read receipts en grupo** | Tabla `chat_group_reads`; al abrir el grupo marca leído + emite `chat:read{group}`; mensajes propios muestran "✓✓ N" | `ChatMessage::markReadGroup/groupReaders`, `ChatController::index` |
| **Visto por última vez** | Columna `users.last_seen_at` (actualizada gedrosselt en `AuthMiddleware`); el header del DM muestra "zuletzt aktiv vor X" | `User::touchLastSeen`, `dist/chat.js` (lastSeenLabel) |
| **Búsqueda global** | `GET /api/chat/search?q=` sobre todos los hilos visibles; input en la lista de hilos → resultados con etiqueta + snippet, click abre el hilo | `ChatMessage::search`, `ChatController::search`, `dist/chat.js` (dm-results) |

**Eventos WS usados:** `chat:message`, `chat:updated`, `chat:deleted`,
`chat:typing`, `chat:read`, `chat:reaction` (todos despachados como
`esg:chat:*` CustomEvents en el bundle, switch del handler WS en `app.min.js`).

---

## 🔜 Siguiente (pendiente)

El chat está **completo** para un colegio. Ideas opcionales a futuro:
- **TURN server** para videollamadas tras NATs estrictos (ahora solo STUN; funciona en la mayoría de redes pero no todas).
- **Llamadas grupales** (varios participantes) — bastante más complejo (malla o SFU).
- Read receipts en grupo con lista de "quién" (ahora solo el número).
- Reenviar mensajes a otro hilo.

---

## Notas técnicas para continuar
- **Cliente → servidor:** no hay WS push desde el cliente; toda acción va por
  REST y el servidor emite el evento WS (patrón ya usado por typing/read/react).
- **Frontend canónico:** `dist/chat.js` (no se compila; editar directo). `app/chat.jsx` es copia espejo para lectura.
- **Nuevos eventos WS:** añadir un `case "chat:<x>"` en el switch del handler WS en `dist/app.min.js` que despache `esg:chat:<x>`, y un listener en `ChatView`.
- **Migraciones DB:** las tablas nuevas van también en `backend/schema.sqlite.sql` (instalaciones nuevas) y como `ALTER/CREATE` en la DB viva.
