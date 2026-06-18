/* ========================================================================
 *  ToDo-Schule — Runtime-Konfiguration (API- & WebSocket-Adressen)
 * ------------------------------------------------------------------------
 *  Dieselbe Datei funktioniert lokal UND auf dem Server, ohne Build.
 *
 *  ►►► PRODUKTION: Stelle DEPLOY_MODE unten richtig ein ◄◄◄
 *
 *   • "shared"  → Shared Hosting (nur Apache + PHP, KEIN SSH/Daemon):
 *       API → <origin><pfad>/backend/public  (über .htaccess von backend/public)
 *       WS  → AUS (kein Dauer-Prozess möglich → kein Echtzeit-Update)
 *       Funktioniert: Aufgaben, Notizen, Klassenliste, Kontaktliste, Login, Push.
 *       Eingeschränkt: Chat & Präsenz aktualisieren erst nach Neuladen.
 *
 *   • "vps"     → Eigener Server / VPS mit Reverse-Proxy (Nginx + systemd):
 *       API → <origin>            (Proxy leitet /api/* an PHP :8085)
 *       WS  → wss://<host>/ws     (Proxy leitet an WS-Server :8090)
 *
 *  Lokale Entwicklung (localhost/127.0.0.1/*.local/private IP) wird IMMER
 *  automatisch erkannt — DEPLOY_MODE wird dann ignoriert.
 * ===================================================================== */
(function () {
  // ─── HIER EINSTELLEN: "shared" oder "vps" ───────────────────────────────
  var DEPLOY_MODE = "shared";
  // ────────────────────────────────────────────────────────────────────────

  var host = location.hostname;
  var isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "" ||
    host.endsWith(".local") ||
    /^(10|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\./.test(host);

  // Verzeichnis, in dem die App liegt (für Unterordner-Installationen).
  // "/todo/ToDo-Schule.html" → "/todo";  "/ToDo-Schule.html" → ""
  function appBase() {
    return location.pathname.substring(0, location.pathname.lastIndexOf("/"));
  }

  if (isLocal) {
    var port = location.port;
    var isXampp = !port || port === "80" || port === "443" || port === "8082";
    if (isXampp) {
      // XAMPP/Apache: API in backend/public im selben Unterverzeichnis.
      window.ESG_API_BASE = location.origin + appBase() + "/backend/public";
      window.ESG_WS_URL = "ws://" + host + ":8090";
    } else {
      // php -S Dev-Modus (start.sh): getrennte Ports.
      window.ESG_API_BASE = location.protocol + "//" + host + ":8083";
      window.ESG_WS_URL = "ws://" + host + ":8090";
    }
  } else if (DEPLOY_MODE === "vps") {
    // Eigener Server: Reverse-Proxy leitet /api/* und /ws weiter.
    var wsProto = location.protocol === "https:" ? "wss:" : "ws:";
    window.ESG_API_BASE = location.origin;
    window.ESG_WS_URL = wsProto + "//" + location.host + "/ws";
  } else {
    // Shared Hosting: API über backend/public, KEIN WebSocket.
    window.ESG_API_BASE = location.origin + appBase() + "/backend/public";
    window.ESG_WS_URL = null; // null = Echtzeit deaktiviert (kein Reconnect-Spam)
  }
})();
