#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

BACKEND_PORT=8083
FRONTEND_PORT=9090

kill_port() {
  lsof -ti:"$1" | xargs kill -9 2>/dev/null || true
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

echo "→ Backend  http://localhost:$BACKEND_PORT"
php -S 0.0.0.0:$BACKEND_PORT -t "$ROOT/backend/public" > /tmp/todo-backend.log 2>&1 &
BACKEND_PID=$!

echo "→ Frontend http://localhost:$FRONTEND_PORT/ToDo-Schule.html"
php -S 0.0.0.0:$FRONTEND_PORT -t "$ROOT" > /tmp/todo-frontend.log 2>&1 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✗ detenido'" INT TERM

sleep 1
curl -sf http://localhost:$BACKEND_PORT/health > /dev/null && echo "✓ listo" || echo "✗ backend no responde"

wait
