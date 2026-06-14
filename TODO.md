# ✅ TODO — Para que funcione 100% como PWA en el servidor

Estado: **la app ya está lista como PWA** (manifest, iconos PNG, service worker,
config por entorno). Lo que queda es **infraestructura del servidor**.
Detalle completo con comandos y configs en [`DEPLOY.md`](./DEPLOY.md).

---

## 🟢 Ya hecho (no tocar)

- [x] Manifest con iconos PNG 192 / 512 / maskable + apple-touch + favicon
- [x] Service Worker (offline + cache, v7) registrado
- [x] `app/config.js`: detecta local vs servidor y arma las URLs de API/WS solo
- [x] Meta viewport / theme-color / apple-mobile-web-app
- [x] Responsive móvil / tablet / desktop
- [x] Backend con CORS configurable (`ALLOWED_ORIGIN`)

---

## 🔴 Imprescindible — sin esto el navegador NO ofrece instalar

- [ ] **Conseguir un dominio** y apuntarlo al servidor (registro DNS A → IP del VPS)
- [ ] **HTTPS** con certificado válido
  - VPS con nginx: `sudo certbot --nginx -d tu-dominio.de`
  - *(localhost no necesita HTTPS; el dominio sí, obligatorio)*

## 🟠 Necesario para que la app funcione en el servidor

- [ ] **Subir los archivos** del repo al servidor (frontend + `backend/`)
- [ ] **nginx** configurado (ver `DEPLOY.md`):
  - [ ] Servir el frontend estático (raíz del repo)
  - [ ] Proxy `/api/` → PHP en `127.0.0.1:8085`
  - [ ] Proxy `/ws` → WebSocket en `127.0.0.1:8090` (con headers `Upgrade`)
  - [ ] `Cache-Control: no-cache` para `/sw.js`
- [ ] **PHP 8.1+** instalado en el servidor (local tenés 8.5)
- [ ] **API PHP corriendo** (php-fpm sirviendo `backend/public/`)
- [ ] **WebSocket como servicio systemd** (`todo-schule-ws.service`) → si no, no hay tiempo real
  - ⚠️ Si el tiempo real "deja de andar" (chat/llamadas no llegan a otros), **reiniciá el proceso WS**. Se desincroniza si queda corriendo durante cambios grandes de esquema.
- [ ] **Web-Push (VAPID)** — para notificaciones con la app cerrada:
  - [ ] `php backend/bin/generate-vapid.php` y pegar las 3 líneas que imprime en `.env` (o dejar `storage/vapid.json`)
- [ ] **Videollamadas tras NATs estrictos:** opcional, añadir un **TURN server** (ahora solo STUN; funciona en la mayoría de redes)
- [ ] **`backend/.env`** en el servidor:
  - [ ] `JWT_SECRET` nuevo (`php -r "echo bin2hex(random_bytes(32));"`)
  - [ ] `SQLITE_PATH` con la ruta absoluta de `database.sqlite`
  - [ ] `ALLOWED_ORIGIN=https://tu-dominio.de`
  - [ ] `VAPID_*` (del paso de Web-Push, si querés push)
- [ ] **Permisos de escritura** para el usuario del servidor (ej. `www-data`) en:
  - [ ] `backend/database.sqlite` (+ `-wal`, `-shm`)
  - [ ] `backend/public/avatars/`
  - [ ] `backend/public/chat-files/`
  - [ ] `backend/uploads/`
- [ ] **Sembrar / migrar la base de datos** en el servidor
  - [ ] `php backend/bin/seed-teachers.php "ca:Alberto Cabrera" "ve:Venedey" …`
  - [ ] (o copiar la `database.sqlite` local — recordá que está en `.gitignore`)

## 🟡 Verificación final

- [ ] Abrir `https://tu-dominio.de/ToDo-Schule.html`
- [ ] DevTools → **Lighthouse → PWA**: todo en verde
- [ ] DevTools → **Application → Manifest**: iconos y scope OK
- [ ] Probar **«Instalar app»** en Chrome (desktop) y «Añadir a inicio» (móvil)
- [ ] Login real funciona (API alcanzable vía HTTPS)
- [ ] Chat en tiempo real funciona (WS vía `wss://`)
- [ ] Probar offline: cerrar datos → la app-shell sigue cargando

---

## 💡 Decisión pendiente

- [ ] **¿Qué tipo de servidor?**
  - VPS con root (nginx + systemd) → opción recomendada, todo lo de arriba aplica
  - Hosting compartido / cPanel → cambia bastante (sin systemd ni nginx propio;
    el WebSocket suele no poder correr como daemon). Avisar para adaptar la guía.
