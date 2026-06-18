# ToDo-Schule — Guía de despliegue en producción

Arquitectura: frontend estático + PHP API (puerto 8085) + PHP WebSocket (puerto 8090) + SQLite. Sin Composer, sin npm, sin build step.

---

## Requisitos del servidor

| Componente | Mínimo | Recomendado |
|---|---|---|
| PHP | 8.1 | 8.2+ |
| Extensiones PHP | `pdo_sqlite`, `mbstring`, `json`, `openssl`, `pcntl`, `posix` | ídem + `gd` |
| Servidor web | Nginx ≥ 1.18 o Apache 2.4 | **Nginx** |
| SQLite | 3.35+ (incluido en PHP) | 3.40+ |
| RAM mínima | 256 MB | 512 MB |
| SO | Debian 11+, Ubuntu 22.04+ | Ubuntu 22.04 LTS |
| HTTPS | **Obligatorio** para PWA + Web Push | Let's Encrypt / Certbot |

```bash
# Ubuntu/Debian — instalar dependencias
sudo apt update
sudo apt install -y php8.2-cli php8.2-sqlite3 php8.2-mbstring \
     php8.2-json php8.2-curl nginx certbot python3-certbot-nginx
```

---

## 1. Clonar y configurar

```bash
cd /var/www
git clone https://github.com/albecabrera/ToDo-Schule.git todo-schule
cd todo-schule

# Permisos de escritura para PHP
sudo chown -R www-data:www-data backend/database.sqlite \
     backend/storage/ backend/uploads/
sudo chmod -R 775 backend/storage/ backend/uploads/

# Directorio de backups
mkdir -p storage/backups
sudo chown www-data:www-data storage/backups
chmod 775 storage/backups
```

---

## 2. Variables de entorno

Crear `backend/.env` — **nunca commitear**:

```dotenv
# ── Aplicación ───────────────────────────────────────────────────────────────
APP_DEBUG=false
ALLOWED_ORIGIN=https://todo.tu-escuela.de

# ── Base de datos ─────────────────────────────────────────────────────────────
DB_DRIVER=sqlite
DB_PATH=/var/www/todo-schule/backend/database.sqlite

# ── JWT ───────────────────────────────────────────────────────────────────────
# Generar: php -r "echo bin2hex(random_bytes(32));"
JWT_ACCESS_SECRET=CAMBIA_ESTO_MIN_32_CHARS
JWT_REFRESH_SECRET=CAMBIA_ESTO_DIFERENTE_32_CHARS
JWT_ACCESS_TTL=900        # 15 min
JWT_REFRESH_TTL=2592000   # 30 días
JWT_ISSUER=todo-schule

# ── WebSocket ─────────────────────────────────────────────────────────────────
WS_HOST=127.0.0.1         # interno; Nginx hace proxy hacia /ws
WS_PORT=8090

# ── Rate limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW=300
RATE_LIMIT_BACKEND=storage/ratelimit

# ── Web Push VAPID ───────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY=          # ver sección 8
VAPID_SUBJECT=mailto:admin@tu-escuela.de
```

> Generar secrets JWT:
> ```bash
> php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
> # Ejecutar dos veces (uno ACCESS, uno REFRESH)
> ```

---

## 3. Inicializar la base de datos

```bash
cd /var/www/todo-schule
sqlite3 backend/database.sqlite < backend/schema.sqlite.sql

# Verificar
sqlite3 backend/database.sqlite ".tables"
# Debe listar: users tasks teams notes chat_messages audit_logs push_subscriptions ...
```

---

## 4. Nginx — configuración completa

`/etc/nginx/sites-available/todo-schule`

```nginx
server {
    listen 80;
    server_name todo.tu-escuela.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name todo.tu-escuela.de;

    ssl_certificate     /etc/letsencrypt/live/todo.tu-escuela.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/todo.tu-escuela.de/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root /var/www/todo-schule;
    index ToDo-Schule.html;

    # ── Frontend estático ─────────────────────────────────────────────────────
    location / {
        try_files $uri $uri/ /ToDo-Schule.html;
    }

    # Service Worker: nunca cachear
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }

    # ── API REST → PHP (8085) ─────────────────────────────────────────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:8085;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        client_max_body_size 52M;    # Attachments hasta 50 MB
    }

    # ── WebSocket → PHP WS (8090) ─────────────────────────────────────────────
    location /ws {
        proxy_pass          http://127.0.0.1:8090;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade    $http_upgrade;
        proxy_set_header    Connection "Upgrade";
        proxy_set_header    Host       $host;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
    }

    # ── Assets: caché agresivo ────────────────────────────────────────────────
    location ~* \.(css|js|png|jpg|svg|ico|woff2|webmanifest)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ── Bloquear acceso a archivos internos ───────────────────────────────────
    location ~ /\.(env|git|sqlite) { deny all; }
    location ~ ^/backend/           { deny all; }
    location ~ ^/storage/           { deny all; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/todo-schule /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. HTTPS con Let's Encrypt

```bash
sudo certbot --nginx -d todo.tu-escuela.de
# Certbot edita Nginx y configura renovación automática
```

---

## 6. Procesos permanentes con systemd

### API REST — `/etc/systemd/system/todo-api.service`

```ini
[Unit]
Description=ToDo-Schule API REST
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/todo-schule/backend
ExecStart=/usr/bin/php -S 127.0.0.1:8085 -t public
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### WebSocket — `/etc/systemd/system/todo-ws.service`

```ini
[Unit]
Description=ToDo-Schule WebSocket Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/todo-schule/backend
ExecStart=/usr/bin/php bin/ws-server.php
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now todo-api todo-ws
sudo systemctl status todo-api todo-ws

# Logs en tiempo real
sudo journalctl -fu todo-api
sudo journalctl -fu todo-ws
```

---

## 7. Cron jobs

```bash
sudo crontab -e -u www-data
```

```cron
# Backup SQLite diario a las 02:00, retención 30 días
0 2 * * * /usr/bin/php /var/www/todo-schule/bin/backup.php --keep=30 >> /var/log/esg-backup.log 2>&1

# Recordatorios de tareas cada minuto
* * * * * /usr/bin/php /var/www/todo-schule/backend/cron-reminders.php >> /var/log/esg-reminders.log 2>&1
```

---

## 8. Web Push (VAPID)

```bash
# El servidor genera las claves la primera vez que se usa Web Push.
# Para generarlas manualmente:
cd /var/www/todo-schule/backend
php -r "
require 'src/bootstrap.php';
\$path = 'storage/vapid.json';
if (!file_exists(\$path)) {
    \$sk = sodium_crypto_sign_keypair();
    \$data = [
        'publicKey'  => base64_encode(sodium_crypto_sign_publickey(\$sk)),
        'privateKey' => base64_encode(sodium_crypto_sign_secretkey(\$sk)),
    ];
    file_put_contents(\$path, json_encode(\$data, JSON_PRETTY_PRINT));
    echo 'Generado: '.\$path.PHP_EOL;
} else {
    echo 'Ya existe: '.\$path.PHP_EOL;
}
\$d = json_decode(file_get_contents(\$path), true);
echo 'VAPID_PUBLIC_KEY=' . \$d['publicKey'] . PHP_EOL;
"
chmod 600 backend/storage/vapid.json
```

Copiar el valor `VAPID_PUBLIC_KEY=...` al `backend/.env`.

> `storage/vapid.json` contiene la clave privada — gitignoreado, nunca exponer.

---

## 9. Primer usuario

```bash
# Via API (después de que el servidor esté corriendo)
curl -X POST https://todo.tu-escuela.de/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tu-escuela.de","password":"CambiarEsto123!","name":"Admin ESG"}'
```

O directamente en SQLite:
```bash
HASH=$(php -r "echo password_hash('CambiarEsto123!', PASSWORD_BCRYPT);")
sqlite3 /var/www/todo-schule/backend/database.sqlite \
  "INSERT INTO users (email, name, password_hash, must_change_password)
   VALUES ('admin@tu-escuela.de', 'Admin ESG', '$HASH', 1);"
```

El flag `must_change_password=1` obliga a cambiar la contraseña en el primer login.

---

## 10. Actualizaciones

```bash
cd /var/www/todo-schule

# 1. Actualizar código
git pull origin main

# 2. Si cambió schema.sqlite.sql, revisar diff y aplicar deltas manualmente
#    NUNCA re-ejecutar schema.sqlite.sql completo en producción (borra datos)
#    Ver backend/schema-update.sql si existe

# 3. Reiniciar procesos
sudo systemctl restart todo-api todo-ws

# 4. El SW se actualiza automático al detectar nueva versión de CACHE en sw.js
```

---

## 11. Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP → redirige a HTTPS
sudo ufw allow 443/tcp   # HTTPS (API + WS vía Nginx proxy)
sudo ufw enable

# Puertos 8085 y 8090 son INTERNOS — no abrir al exterior
```

---

## 12. Checklist pre-lanzamiento

- [ ] `APP_DEBUG=false` en `backend/.env`
- [ ] `ALLOWED_ORIGIN` coincide exactamente con la URL de producción
- [ ] Secrets JWT generados (no los de ejemplo)
- [ ] `backend/database.sqlite` gitignoreado, permisos `www-data`
- [ ] `backend/storage/vapid.json` gitignoreado
- [ ] HTTPS activo, sin warnings en DevTools
- [ ] SW sin errores en DevTools → Application → Service Workers
- [ ] `sudo nginx -t` sin errores
- [ ] `sudo systemctl status todo-api todo-ws` → `active (running)`
- [ ] Cron activo: `sudo crontab -l -u www-data`
- [ ] Primer usuario puede hacer login y recibe notificaciones push
- [ ] Backup manual exitoso: `sudo -u www-data php bin/backup.php`

---

## Solución de problemas

### WebSocket no conecta

```bash
sudo systemctl status todo-ws
sudo journalctl -fu todo-ws --since "5 min ago"

# Test interno
curl -i -N \
  -H "Upgrade: websocket" -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  http://127.0.0.1:8090
```

### API devuelve 502 Bad Gateway

```bash
sudo systemctl restart todo-api
sudo journalctl -fu todo-api --since "2 min ago"
```

### SQLite "database is locked"

WAL mode ya activo (tolerante a lecturas concurrentes). Si persiste después de un crash:
```bash
sqlite3 backend/database.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Service Worker con caché vieja

DevTools → Application → Service Workers → **Update** o **Unregister**. El SW se auto-invalida cuando `CACHE` en `sw.js` cambia de versión.

---

## Desarrollo local

```bash
# 3 terminales paralelas:

# Terminal 1 — API
cd backend && php -S 0.0.0.0:8085 -t public

# Terminal 2 — WebSocket
cd backend && php bin/ws-server.php

# Terminal 3 — Frontend estático
python3 -m http.server 5500
# Abrir: http://localhost:5500/ToDo-Schule.html
```

`app/config.js` detecta `localhost` automáticamente y apunta a los puertos locales.
