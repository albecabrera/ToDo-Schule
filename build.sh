#!/usr/bin/env bash
# ============================================================================
#  ToDo-Schule — Produktions-Build
#  Konkateniert alle App-Module (Reihenfolge wichtig!) und kompiliert das JSX
#  einmalig mit esbuild → dist/app.min.js. Der Browser braucht damit KEIN
#  Babel mehr (schnellerer Start, PWA-tauglich, offline-cachebar).
#
#  Nutzung:  ./build.sh          einmalig bauen
#            ./build.sh --watch  bei Änderungen automatisch neu bauen
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

FILES=(
  app/data.js
  tweaks-panel.jsx
  app/icons.jsx
  app/ui.jsx
  app/login.jsx
  app/shell.jsx
  app/taskviews.jsx
  app/drawer.jsx
  app/overlays.jsx
  app/notes.jsx
  app/calendar.jsx
  app/app.jsx
)

mkdir -p dist

build() {
  local tmp
  tmp="$(mktemp -d)/bundle.jsx"  # macOS-mktemp erlaubt kein Suffix im Template
  for f in "${FILES[@]}"; do
    printf '\n// ──── %s ────\n' "$f" >> "$tmp"
    command cat "$f" >> "$tmp"
  done
  npx -y esbuild "$tmp" --loader:.jsx=jsx --minify --target=es2018 \
    --outfile=dist/app.min.js --log-level=warning
  rm -f "$tmp"
  echo "✓ dist/app.min.js  ($(du -h dist/app.min.js | cut -f1 | tr -d ' '))"
}

build

if [[ "${1:-}" == "--watch" ]]; then
  echo "Watching für Änderungen… (Ctrl+C zum Beenden)"
  while true; do
    if command -v fswatch >/dev/null; then
      fswatch -1 "${FILES[@]}" > /dev/null
    else
      sleep 2
    fi
    build || true
  done
fi
