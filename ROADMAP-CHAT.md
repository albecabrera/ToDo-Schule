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

**Eventos WS usados:** `chat:message`, `chat:updated`, `chat:deleted`,
`chat:typing`, `chat:read`, `chat:reaction` (todos despachados como
`esg:chat:*` CustomEvents en el bundle, switch del handler WS en `app.min.js`).

---

## 🔜 Siguiente (pendiente)

### 1. Responder a un mensaje (reply / quote) — **esfuerzo bajo-medio**
- Columna `reply_to_id` en `chat_messages`.
- UI: botón "Responder" (ya hay acciones al hover) → cita el mensaje arriba del composer; la burbuja muestra el fragmento citado.

### 2. 📹 Llamada / videollamada 1:1 (WebRTC) — **esfuerzo alto · riesgo alto**
- El puente WS por tabla `events` (~1s) NO sirve para señalización en vivo.
- Requiere canal de señalización dedicado (WS directo cliente↔servidor para
  ofertas/answers/ICE) + STUN/TURN.
- Recomendado solo si se justifica; es prácticamente otro módulo.

### 5. Otros refinamientos
- Read receipts en grupo (quién leyó) — complejo, opcional.
- Indicador "en línea / visto por última vez" en el header del DM (ya hay presencia).
- Buscar dentro del chat.
- Fijar/anclar mensajes importantes.

---

## Notas técnicas para continuar
- **Cliente → servidor:** no hay WS push desde el cliente; toda acción va por
  REST y el servidor emite el evento WS (patrón ya usado por typing/read/react).
- **Frontend canónico:** `dist/chat.js` (no se compila; editar directo). `app/chat.jsx` es copia espejo para lectura.
- **Nuevos eventos WS:** añadir un `case "chat:<x>"` en el switch del handler WS en `dist/app.min.js` que despache `esg:chat:<x>`, y un listener en `ChatView`.
- **Migraciones DB:** las tablas nuevas van también en `backend/schema.sqlite.sql` (instalaciones nuevas) y como `ALTER/CREATE` en la DB viva.
