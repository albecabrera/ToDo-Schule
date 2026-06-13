# ToDo-Schule — PWA & Despliegue al servidor

Guía para tener la app funcionando como **Progressive Web App** en local y
luego pasarla a tu servidor con tu dominio.

---

## ✅ Checklist PWA — qué necesita la app para ser instalable

| Requisito | Estado | Dónde |
|-----------|--------|-------|
| **Manifest** (`manifest.webmanifest`) con `name`, `start_url`, `scope`, `display:standalone`, `theme_color` | ✅ Listo | `manifest.webmanifest` |
| **Iconos PNG** 192×192 y 512×512 (obligatorio para instalar en Chrome/Android) | ✅ Listo | `assets/icons/` |
| **Icono maskable** 512×512 (recorte adaptativo Android) | ✅ Listo | `assets/icons/icon-maskable-512.png` |
| **apple-touch-icon** PNG 180×180 (iOS) | ✅ Listo | `assets/icons/apple-touch-icon.png` |
| **Service Worker** registrado (offline + cache) | ✅ Listo | `sw.js` (registrado en `app.jsx`) |
| **Meta viewport + theme-color + apple-mobile-web-app-*** | ✅ Listo | `ToDo-Schule.html` |
| **Config API/WS por entorno** (mismo build local y servidor) | ✅ Listo | `app/config.js` |
| **HTTPS** (obligatorio en producción; localhost está exento) | ⏳ Servidor | ver abajo |
| **Responsive** móvil / tablet / desktop | ✅ Listo | `app/responsive.css` |
| Install prompt nativo del navegador | ✅ Automático con lo anterior (en HTTPS) | — |

> En `localhost` la PWA es instalable **sin HTTPS**. En tu dominio
> **necesitás HTTPS sí o sí**, o el navegador no ofrece instalar.

---

## 🖥️ Local (estado actual — 3 procesos)

```bash
# 1) API REST
cd backend && php -S 0.0.0.0:8085 -t public

# 2) WebSocket (tiempo real)
cd backend && php bin/ws-server.php          # ws://localhost:8090

# 3) Frontend estático
python3 -m http.server 5500                  # http://localhost:5500/ToDo-Schule.html
```

`app/config.js` detecta `localhost` y apunta solo a `:8085` (API) y `:8090` (WS).
No hay que tocar nada.

---

## 🌐 Paso al servidor + dominio

La idea: **una sola Origin** (`https://tu-dominio`). El servidor web (nginx)
sirve el frontend y reenvía `/api/*` a PHP y `/ws` al WebSocket. Así
`app/config.js` cambia solo a modo producción (sin editar nada).

### 1. Backend `.env` (en el servidor)

```ini
APP_ENV=production
JWT_SECRET=<genera con: php -r "echo bin2hex(random_bytes(32));">
DB_DRIVER=sqlite
SQLITE_PATH=/ruta/absoluta/backend/database.sqlite
ALLOWED_ORIGIN=https://tu-dominio.de        # ← tu dominio exacto (sin / final)
```

> `ALLOWED_ORIGIN` ya lo lee `src/Config/Cors.php`. Poné tu dominio real,
> no `*`, para que las cookies/credenciales funcionen seguras.

### 2. nginx (reverse proxy + estáticos + HTTPS)

```nginx
server {
  listen 443 ssl http2;
  server_name tu-dominio.de;

  ssl_certificate     /etc/letsencrypt/live/tu-dominio.de/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tu-dominio.de/privkey.pem;

  root /var/www/todo-schule;          # carpeta del frontend (raíz del repo)
  index ToDo-Schule.html;

  # Frontend estático
  location / {
    try_files $uri $uri/ /ToDo-Schule.html;
  }

  # API PHP (php-fpm escuchando en 127.0.0.1:8085 o socket)
  location /api/ {
    proxy_pass http://127.0.0.1:8085;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # WebSocket
  location /ws {
    proxy_pass http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 1d;
  }

  # No cachear el service worker (siempre fresco)
  location = /sw.js { add_header Cache-Control "no-cache"; }
}

# HTTP → HTTPS
server {
  listen 80;
  server_name tu-dominio.de;
  return 301 https://$host$request_uri;
}
```

> HTTPS gratis con **Let's Encrypt**: `sudo certbot --nginx -d tu-dominio.de`

### 3. WebSocket como servicio (systemd)

`/etc/systemd/system/todo-schule-ws.service`:

```ini
[Unit]
Description=ToDo-Schule WebSocket
After=network.target

[Service]
ExecStart=/usr/bin/php /var/www/todo-schule/backend/bin/ws-server.php
WorkingDirectory=/var/www/todo-schule/backend
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now todo-schule-ws
```

### 4. PHP API
Servir `backend/public/` con php-fpm en `127.0.0.1:8085` (o un socket que
nginx proxee). Asegurar permisos de escritura en:
- `backend/database.sqlite` (+ `-wal`, `-shm`)
- `backend/public/avatars/`
- `backend/public/chat-files/`
- `backend/uploads/`

### 5. Listo
Al abrir `https://tu-dominio.de/ToDo-Schule.html`, `app/config.js` detecta
que **no es localhost** y usa:
- API → `https://tu-dominio.de` (+ rutas `/api/...`)
- WS  → `wss://tu-dominio.de/ws`

El navegador ofrecerá **«Instalar app»** automáticamente.

---

## 🔎 Verificar la PWA
Chrome → DevTools → **Lighthouse** → categoría *Progressive Web App*, o
**Application → Manifest / Service Workers** para ver iconos, scope e instalación.
