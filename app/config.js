/* ========================================================================
 *  ToDo-Schule — Runtime-Konfiguration (API- & WebSocket-Adressen)
 * ------------------------------------------------------------------------
 *  Dieselbe Datei funktioniert lokal UND auf dem Server, ohne Build:
 *
 *   • Lokale Entwicklung (localhost / 127.0.0.1 / *.local):
 *       API  → http://<host>:8085
 *       WS   → ws://<host>:8090
 *
 *   • Produktion (eigene Domain, via HTTPS):
 *       API-Basis → https://<domain>          (Routen wie /api/... werden
 *                                              vom Reverse-Proxy weitergeleitet)
 *       WS        → wss://<domain>/ws          (Reverse-Proxy → WS-Server)
 *
 *  Wenn dein Server eine andere Aufteilung nutzt, überschreibe einfach
 *  die beiden Werte unten (window.ESG_API_BASE / window.ESG_WS_URL).
 * ===================================================================== */
(function () {
  var host = location.hostname;
  var isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "" ||
    host.endsWith(".local") ||
    /^(10|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\./.test(host);

  if (isLocal) {
    var port = location.port;
    var isXampp = !port || port === "80" || port === "443" || port === "8082";
    if (isXampp) {
      // XAMPP/Apache mode: API en backend/public dentro del mismo subdirectorio.
      var appBase = location.pathname.substring(0, location.pathname.lastIndexOf("/"));
      window.ESG_API_BASE = location.origin + appBase + "/backend/public";
      window.ESG_WS_URL = "ws://" + host + ":8090";
    } else {
      // php -S dev mode (start.sh): puertos separados.
      window.ESG_API_BASE = location.protocol + "//" + host + ":8083";
      window.ESG_WS_URL = "ws://" + host + ":8090";
    }
  } else {
    // Produktion: gleiche Domain. Der Reverse-Proxy leitet /api/* an die
    // PHP-API und /ws an den WebSocket-Server weiter.
    // Die App hängt die Routen (z. B. "/api/tasks") selbst an die Basis an,
    // deshalb ist die Basis NUR die Origin (sonst entstünde "/api/api/...").
    var wsProto = location.protocol === "https:" ? "wss:" : "ws:";
    window.ESG_API_BASE = location.origin;
    window.ESG_WS_URL = wsProto + "//" + location.host + "/ws";
  }
})();
