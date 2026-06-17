// app/klasseliste.jsx — ToDo-Schule Klasseliste
(function () {
"use strict";
const { useState, useEffect, useRef } = React;
const h = React.createElement;

const STUDENTS_5D = [
  "Almakharzi, Talya","Azoualesei, Peri Akoun","Behlert, Luna Mia",
  "Berger, Mio","Brenig, Melissa","Chebli, Reihan Rawan",
  "Crismaru, Sofia-Elena","El Mehdaoui, Mehdi","Faeq, Warin",
  "Hamza, Hazim","Hassan, Liliana","Heuskel, Raphael Joachim",
  "Jawad, Armaghan","Juneja, Nivaan","Kahramanoglu, Safiya",
  "Kassim, Adam","Khalil, Sevdar","Kirchhoff, Mika",
  "Laffin, Eneas Thomas","Majidzada, Zohal","Morhj, Amira",
  "Ndreu, Arteo","Nemr, Paulo","Pala-Maftei, Edanur",
  "Proshutia, Vira","Salehi, Shukran","Staszko, Noah",
  "Tallouz, Hanin K. M. M.",
];

function genId() { return Math.random().toString(36).slice(2, 9); }

function apiFetch(path, opts = {}) {
  if (window.ESG_API && window.ESG_API.fetch) return window.ESG_API.fetch(path, opts);
  const base = window.ESG_API_BASE || "";
  const token = localStorage.getItem("accessToken") || "";
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  return fetch(base + path, { ...opts, headers }).then(r => r.json());
}

function toast(title, body) {
  if (window._addToast) window._addToast()({ title, body });
}

function triggerConfetti(colTitle) {
  const overlay = document.createElement("div");
  overlay.className = "kl-confetti-overlay";
  const colors = ["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16"];
  for (let i = 0; i < 70; i++) {
    const dot = document.createElement("div");
    dot.className = "kl-confetti-dot";
    const size = 6 + Math.random() * 8;
    dot.style.cssText = [
      `left:${Math.random()*100}%`,
      `background:${colors[Math.floor(Math.random()*colors.length)]}`,
      `animation-delay:${(Math.random()*0.9).toFixed(2)}s`,
      `animation-duration:${(1.4+Math.random()*0.8).toFixed(2)}s`,
      `width:${size.toFixed(0)}px`,
      `height:${size.toFixed(0)}px`,
      `border-radius:${Math.random()>0.4?"50%":"3px"}`,
    ].join(";");
    overlay.appendChild(dot);
  }
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3500);
  toast("🎉 Alle abgegeben!", colTitle ? `Spalte "${colTitle}" ist vollständig ausgefüllt!` : "Alle Schüler·innen haben abgegeben!");
}

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return iso; }
}

// ── Export helpers ────────────────────────────────────────────────────────────
function buildTableHTML(list) {
  const cols = list.columns || [];
  const students = list.students || [];
  const checks = list.checks || {};
  const date = new Date().toLocaleDateString("de-DE");

  const header = `<tr>
    <th style="text-align:left;background:#e8eaf6;padding:8px 12px;border:1px solid #c5cae9">Name</th>
    ${cols.map(c => `<th style="text-align:center;background:#e8eaf6;padding:8px 12px;border:1px solid #c5cae9;min-width:90px">${c.type==="date"?"📅 ":""}${c.title}</th>`).join("")}
  </tr>`;

  const progress = `<tr>
    <td style="background:#f5f5f5;padding:6px 12px;border:1px solid #e0e0e0;font-size:10pt;font-weight:bold">Fortschritt</td>
    ${cols.map(col => {
      const vals = students.map((_, si) => checks[`${si}:${col.id}`]);
      const done = col.type === "date"
        ? vals.filter(v => v && typeof v === "string").length
        : vals.filter(Boolean).length;
      const pct = students.length ? Math.round(done / students.length * 100) : 0;
      return `<td style="background:#f5f5f5;text-align:center;border:1px solid #e0e0e0;font-size:10pt">${done}/${students.length} (${pct}%)</td>`;
    }).join("")}
  </tr>`;

  const rows = students.map((name, si) => {
    const cells = cols.map(col => {
      const val = checks[`${si}:${col.id}`];
      let display = "";
      if (col.type === "date") display = val ? fmtDate(val) : "";
      else display = val ? '<span style="color:#16a34a;font-weight:bold">✓</span>' : "";
      return `<td style="text-align:center;border:1px solid #e0e0e0;padding:5px 8px">${display}</td>`;
    }).join("");
    return `<tr><td style="padding:6px 12px;border:1px solid #e0e0e0;font-weight:500">${name}</td>${cells}</tr>`;
  }).join("");

  return `<h2 style="font-family:Arial,sans-serif;margin-bottom:4px">Klasseliste — Klasse ${list.name}</h2>
<p style="font-family:Arial,sans-serif;color:#666;font-size:10pt;margin-bottom:12px">${students.length} Schüler·innen · Stand: ${date}</p>
<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:11pt"><thead>${header}${progress}</thead><tbody>${rows}</tbody></table>`;
}

// colIds = null → alle Spalten; colIds = Set<string> → nur diese
function buildChatText(list, colIds = null) {
  const allCols = list.columns || [];
  const cols = colIds ? allCols.filter(c => colIds.has(c.id)) : allCols;
  const students = list.students || [];
  const checks = list.checks || {};
  let msg = `📋 Klasseliste ${list.name} (${new Date().toLocaleDateString("de-DE")})\n`;
  cols.forEach(col => {
    const vals = students.map((_, si) => checks[`${si}:${col.id}`]);
    const done = col.type === "date"
      ? vals.filter(v => v && typeof v === "string").length
      : vals.filter(Boolean).length;
    const missing = students.filter((_, si) => {
      const v = checks[`${si}:${col.id}`];
      return col.type === "date" ? !(v && typeof v === "string") : !v;
    }).map(n => n.split(",")[0].trim());
    msg += `\n${col.type === "date" ? "📅" : "✓"} ${col.title}: ${done}/${students.length}`;
    if (missing.length > 0 && missing.length <= 12) msg += `\nFehlt: ${missing.join(", ")}`;
  });
  return msg.trim();
}

// ── Standalone HTML (adjunto en chat, se abre en el browser) ─────────────────
function buildStandaloneHTML(list, colIds) {
  const allCols = list.columns || [];
  const cols    = colIds ? allCols.filter(c => colIds.has(c.id)) : allCols;
  const students = list.students || [];
  const checks   = list.checks   || {};
  const date     = new Date().toLocaleDateString("de-DE");

  const ths = `<th style="text-align:left;min-width:160px;padding:10px 14px">Name</th>` +
    cols.map(c => `<th>${c.type==="date"?"📅 ":""}${c.title}</th>`).join("");

  const prog = `<td style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">Fortschritt</td>` +
    cols.map(col => {
      const done = students.filter((_, si) => {
        const v = checks[`${si}:${col.id}`];
        return col.type === "date" ? (v && typeof v === "string") : !!v;
      }).length;
      const pct = students.length ? Math.round(done/students.length*100) : 0;
      return `<td>${done}/${students.length} (${pct}%)</td>`;
    }).join("");

  const rows = students.map((name, si) => {
    const cells = cols.map(col => {
      const val = checks[`${si}:${col.id}`];
      if (col.type === "date") return `<td style="color:#16a34a;font-weight:600;font-size:12px">${val ? fmtDate(val) : ""}</td>`;
      return `<td style="color:#16a34a;font-weight:800;font-size:16px">${val ? "✓" : ""}</td>`;
    }).join("");
    return `<tr><td style="text-align:left;font-weight:500;padding:9px 14px">${name}</td>${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Klasseliste – ${list.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f8fafc;color:#1e293b;padding:24px}
.card{max-width:960px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 28px rgba(0,0,0,.1);overflow:hidden}
.hdr{background:linear-gradient(135deg,#312f80,#4f46e5);color:#fff;padding:24px 28px}
.hdr h1{font-size:22px;font-weight:800;margin-bottom:6px}
.hdr p{font-size:13px;opacity:.78}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:#f1f5f9;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0;text-align:center;white-space:nowrap}
thead th:first-child{text-align:left}
.pr td{background:#f0fdf4;font-size:11px;font-weight:700;color:#15803d;padding:7px 14px;border-bottom:2px solid #e2e8f0;text-align:center}
tbody tr:nth-child(even) td{background:#fafafa}
tbody tr:hover td{background:#eff6ff}
td{padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center}
.ft{padding:12px 28px;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9}
@media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0;max-width:none}}
</style></head>
<body><div class="card">
<div class="hdr"><h1>📋 Klasseliste – Klasse ${list.name}</h1>
<p>${students.length} Schüler·innen · ${cols.length} Spalte${cols.length!==1?"n":""} · Stand: ${date}</p></div>
<div class="tw"><table>
<thead><tr>${ths}</tr><tr class="pr">${prog}</tr></thead>
<tbody>${rows}</tbody>
</table></div>
<div class="ft">Geteilt über ToDo-Schule · ESG Bonn-Bad Godesberg · ${date}</div>
</div></body></html>`;
}

// ── ColumnEditor ──────────────────────────────────────────────────────────────
function ColumnEditor({ columns, onChange }) {
  function upd(i, patch) { onChange(columns.map((c, j) => j === i ? { ...c, ...patch } : c)); }
  function rem(i) { onChange(columns.filter((_, j) => j !== i)); }
  function add() { onChange([...columns, { id: genId(), title: "Neue Spalte", type: "check" }]); }

  return h("div", { className: "kl-col-editor" },
    columns.map((col, i) =>
      h("div", { key: col.id, className: "kl-col-row" },
        h("input", {
          className: "input kl-col-row-input",
          value: col.title,
          placeholder: "Spaltenname",
          onChange: e => upd(i, { title: e.target.value }),
        }),
        h("button", {
          type: "button",
          className: `kl-type-btn${col.type === "date" ? " on" : ""}`,
          onClick: () => upd(i, { type: col.type === "date" ? "check" : "date" }),
          title: col.type === "date" ? "Datum → Checkbox wechseln" : "Checkbox → Datum wechseln",
        }, col.type === "date" ? "📅" : "✓"),
        h("button", { type: "button", className: "kl-col-remove", onClick: () => rem(i) }, "×")
      )
    ),
    h("button", { type: "button", className: "btn btn-soft btn-sm kl-add-col-inline", onClick: add }, "+ Spalte hinzufügen")
  );
}

// ── CreateListModal ───────────────────────────────────────────────────────────
function CreateListModal({ onClose, onCreate }) {
  const [name, setName]       = useState("");
  const [stuText, setStuText] = useState(STUDENTS_5D.join("\n"));
  const [columns, setColumns] = useState([
    { id: genId(), title: "Abgabe 1",   type: "check" },
    { id: genId(), title: "Abgabe 2",   type: "check" },
    { id: genId(), title: "Hausaufgabe", type: "check" },
  ]);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const students = stuText.split("\n").map(t => t.trim()).filter(Boolean);
      await onCreate({ name: name.trim(), columns, students });
      onClose();
    } finally { setBusy(false); }
  }

  return h("div", { className: "kl-modal-backdrop", onClick: e => e.target === e.currentTarget && onClose() },
    h("div", { className: "kl-modal" },
      h("div", { className: "kl-modal-header" },
        h("h2", { className: "kl-modal-title" }, "➕ Neue Klasseliste"),
        h("button", { className: "iconbtn", onClick: onClose }, "✕")
      ),
      h("form", { className: "kl-modal-body", onSubmit: submit },
        h("label", { className: "kl-label" }, "Klassenname"),
        h("input", {
          className: "input", value: name, autoFocus: true, required: true,
          onChange: e => setName(e.target.value), placeholder: "z. B. 6a",
        }),
        h("label", { className: "kl-label" }, "Spalten"),
        h(ColumnEditor, { columns, onChange: setColumns }),
        h("label", { className: "kl-label" }, "Schülerliste — eine pro Zeile"),
        h("textarea", {
          className: "kl-textarea", value: stuText, rows: 10,
          onChange: e => setStuText(e.target.value),
        }),
        h("div", { className: "kl-modal-footer" },
          h("button", { type: "button", className: "btn", onClick: onClose }, "Abbrechen"),
          h("button", { type: "submit", className: "btn btn-primary", disabled: busy },
            busy ? "Erstellen…" : "Erstellen"
          )
        )
      )
    )
  );
}

// ── EditModal ─────────────────────────────────────────────────────────────────
function EditModal({ list, onClose, onSave }) {
  const [name, setName]       = useState(list.name || "");
  const [columns, setColumns] = useState(() =>
    (list.columns || []).map(c => ({ ...c, type: c.type || "check" }))
  );
  const [stuText, setStuText] = useState((list.students || []).join("\n"));
  const [busy, setBusy]       = useState(false);

  async function save() {
    setBusy(true);
    try {
      const students = stuText.split("\n").map(t => t.trim()).filter(Boolean);
      const validIds = new Set(columns.map(c => c.id));
      const checks = Object.fromEntries(
        Object.entries(list.checks || {}).filter(([k]) => validIds.has(k.split(":").pop()))
      );
      await onSave({ name: name.trim() || list.name, columns, students, checks });
      onClose();
    } finally { setBusy(false); }
  }

  return h("div", { className: "kl-modal-backdrop", onClick: e => e.target === e.currentTarget && onClose() },
    h("div", { className: "kl-modal" },
      h("div", { className: "kl-modal-header" },
        h("h2", { className: "kl-modal-title" }, "✏️ Bearbeiten"),
        h("button", { className: "iconbtn", onClick: onClose }, "✕")
      ),
      h("div", { className: "kl-modal-body" },
        h("label", { className: "kl-label" }, "Klassenname"),
        h("input", { className: "input", value: name, onChange: e => setName(e.target.value) }),
        h("label", { className: "kl-label" }, "Spalten"),
        h(ColumnEditor, { columns, onChange: setColumns }),
        h("label", { className: "kl-label" }, "Schülerliste — eine pro Zeile"),
        h("textarea", { className: "kl-textarea", value: stuText, rows: 12, onChange: e => setStuText(e.target.value) }),
      ),
      h("div", { className: "kl-modal-footer" },
        h("button", { className: "btn", onClick: onClose }, "Abbrechen"),
        h("button", { className: "btn btn-primary", onClick: save, disabled: busy },
          busy ? "Speichern…" : "Speichern"
        )
      )
    )
  );
}

// ── SendChatModal ─────────────────────────────────────────────────────────────
function SendChatModal({ list, onClose }) {
  const allCols = list.columns || [];

  const [users, setUsers]         = useState([]);
  const [recipientId, setRec]     = useState(null); // null = Gruppenkanal
  const [selectedCols, setSelCols]= useState(() => new Set(allCols.map(c => c.id))); // alle
  const [busy, setBusy]           = useState(false);

  const allSelected  = selectedCols.size === allCols.length;
  const noneSelected = selectedCols.size === 0;
  const preview      = buildChatText(list, noneSelected ? null : selectedCols);

  useEffect(() => {
    Promise.all([apiFetch("/api/users"), apiFetch("/api/users/me")])
      .then(([usersRes, meRes]) => {
        const all  = usersRes.users || [];
        const myId = meRes.user?.id;
        setUsers(myId ? all.filter(u => u.id !== myId) : all);
      })
      .catch(() => {});
  }, []);

  function toggleCol(id) {
    setSelCols(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function toggleAll() {
    setSelCols(allSelected ? new Set() : new Set(allCols.map(c => c.id)));
  }

  async function send() {
    if (noneSelected) return;
    setBusy(true);
    try {
      const activeCols = allSelected ? null : selectedCols;
      const fileName   = `Klasseliste_${list.name}_${new Date().toISOString().slice(0,10)}.html`;
      const html       = buildStandaloneHTML(list, activeCols);

      // Upload the HTML as a chat file attachment
      const base  = window.ESG_API_BASE || "";
      const token = localStorage.getItem("accessToken") || "";
      const form  = new FormData();
      form.append("file", new Blob([html], { type: "text/html" }), fileName);
      const up = await fetch(base + "/api/chat/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: form,
      }).then(r => r.json());

      const body = {
        content: buildChatText(list, activeCols),
        attachment_url:  up.url,
        attachment_name: up.name,
      };
      if (recipientId) body.to = recipientId;
      await apiFetch("/api/chat", { method: "POST", body: JSON.stringify(body) });
      toast(
        recipientId ? "Direktnachricht gesendet" : "Im Chat geteilt",
        `Klasseliste ${list.name} wurde gesendet.`
      );
      onClose();
    } catch(e) {
      console.error(e);
      toast("Fehler", "Senden fehlgeschlagen.");
      setBusy(false);
    }
  }

  return h("div", { className: "kl-modal-backdrop", onClick: e => e.target === e.currentTarget && onClose() },
    h("div", { className: "kl-modal kl-modal-chat" },
      h("div", { className: "kl-modal-header" },
        h("h2", { className: "kl-modal-title" }, "💬 Im Chat teilen"),
        h("button", { className: "iconbtn", onClick: onClose }, "✕")
      ),
      h("div", { className: "kl-modal-body" },

        // ── Empfänger ──────────────────────────────────────────────────────
        h("label", { className: "kl-label" }, "Empfänger"),
        h("div", { className: "kl-recipient-list" },
          h("button", {
            type: "button",
            className: `kl-recipient${!recipientId ? " on" : ""}`,
            onClick: () => setRec(null),
          },
            h("span", { className: "kl-recipient-avatar kl-avatar-all" }, "👥"),
            h("div", { className: "kl-recipient-info" },
              h("span", { className: "kl-recipient-name" }, "Alle"),
              h("span", { className: "kl-recipient-email" }, "Gruppenkanal")
            )
          ),
          users.map(u => h("button", {
            key: u.id, type: "button",
            className: `kl-recipient${recipientId === u.id ? " on" : ""}`,
            onClick: () => setRec(u.id),
          },
            h("span", { className: "kl-recipient-avatar" },
              u.avatar_url
                ? h("img", { src: u.avatar_url, alt: u.name })
                : (u.name || "?").charAt(0).toUpperCase()
            ),
            h("div", { className: "kl-recipient-info" },
              h("span", { className: "kl-recipient-name" }, u.name),
              h("span", { className: "kl-recipient-email" }, u.email)
            )
          ))
        ),

        // ── Spalten auswählen ──────────────────────────────────────────────
        h("label", { className: "kl-label" }, "Spalten"),
        h("div", { className: "kl-col-picker" },
          // "Alle" toggle
          h("label", { className: `kl-col-pick-item kl-col-pick-all${allSelected ? " on" : ""}` },
            h("input", {
              type: "checkbox", checked: allSelected,
              onChange: toggleAll,
            }),
            h("span", { className: "kl-col-pick-check" }, allSelected ? "✓" : ""),
            h("span", { className: "kl-col-pick-label" }, "Alle Spalten")
          ),
          // Individual columns
          allCols.map(col => h("label", {
            key: col.id,
            className: `kl-col-pick-item${selectedCols.has(col.id) ? " on" : ""}`,
          },
            h("input", {
              type: "checkbox",
              checked: selectedCols.has(col.id),
              onChange: () => toggleCol(col.id),
            }),
            h("span", { className: "kl-col-pick-check" }, selectedCols.has(col.id) ? "✓" : ""),
            h("span", { className: "kl-col-pick-label" },
              col.type === "date" ? "📅 " : "✓ ", col.title
            )
          ))
        ),
        noneSelected && h("p", { className: "kl-col-pick-warn" }, "⚠️ Mindestens eine Spalte auswählen."),

        // ── Vorschau ───────────────────────────────────────────────────────
        h("label", { className: "kl-label" }, "Vorschau"),
        h("pre", { className: "kl-chat-preview" }, preview || "(keine Spalte gewählt)")
      ),
      h("div", { className: "kl-modal-footer" },
        h("button", { className: "btn", onClick: onClose }, "Abbrechen"),
        h("button", {
          className: "btn btn-primary", onClick: send,
          disabled: busy || noneSelected,
        },
          busy ? "Senden…" : (recipientId ? "Direkt senden" : "An alle senden")
        )
      )
    )
  );
}

// ── ShareMenu ─────────────────────────────────────────────────────────────────
function ShareMenu({ list, onClose, onOpenChatModal }) {
  const ref = useRef();

  useEffect(() => {
    function hd(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    setTimeout(() => document.addEventListener("mousedown", hd), 0);
    return () => document.removeEventListener("mousedown", hd);
  }, []);

  function exportPDF() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"><title>Klasse ${list.name}</title>
      <style>body{margin:20px;font-family:Arial,sans-serif}@media print{@page{margin:1.5cm}}</style>
    </head><body>${buildTableHTML(list)}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
    onClose();
  }

  function exportWord() {
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Klasse ${list.name}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>body{font-family:Arial,sans-serif;font-size:11pt}</style>
</head><body>${buildTableHTML(list)}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Klasseliste_${list.name}_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    onClose();
  }

  function sendEmail() {
    const students = list.students || [];
    const cols = list.columns || [];
    const checks = list.checks || {};
    const date = new Date().toLocaleDateString("de-DE");
    const subject = `Klasseliste ${list.name} — ${date}`;
    let body = `Klasseliste Klasse ${list.name} (${date})\n${students.length} Schüler·innen\n\n`;
    cols.forEach(col => {
      const vals = students.map((_, si) => checks[`${si}:${col.id}`]);
      const done = col.type === "date" ? vals.filter(v => v && typeof v === "string").length : vals.filter(Boolean).length;
      const missing = students.filter((_, si) => {
        const v = checks[`${si}:${col.id}`];
        return col.type === "date" ? !(v && typeof v === "string") : !v;
      });
      body += `${col.title}: ${done}/${students.length} eingereicht\n`;
      if (missing.length > 0) body += `Fehlt: ${missing.join(", ")}\n`;
      body += "\n";
    });
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onClose();
  }

  const items = [
    { icon: "📄", label: "Als PDF drucken", action: exportPDF },
    { icon: "📝", label: "Als Word (.doc)",  action: exportWord },
    { icon: "💬", label: "Im Chat teilen",   action: () => { onClose(); onOpenChatModal(); } },
    { icon: "📧", label: "Per E-Mail",        action: sendEmail },
  ];

  return h("div", { ref, className: "kl-share-menu" },
    items.map(({ icon, label, action }) =>
      h("button", { key: label, className: "kl-share-item", onClick: action },
        h("span", { className: "kl-share-icon" }, icon), label
      )
    )
  );
}

// ── KlasselisteScreen ─────────────────────────────────────────────────────────
function KlasselisteScreen() {
  const [lists, setLists]             = useState([]);
  const [activeId, setActiveId]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // null|"create"|"edit"|"delete"|"share"|"sendchat"
  const [inlineCol, setInlineCol]     = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const presenceRef                   = useRef({});
  const myUserIdRef                   = useRef(null);

  useEffect(() => { loadLists(); }, []);

  // Feature 1: Presencia en tiempo real
  useEffect(() => {
    apiFetch("/api/users/me").then(r => {
      myUserIdRef.current = r?.user?.id ?? null;
    }).catch(() => {});

    function sendPresence() {
      apiFetch("/api/klasselisten/presence", { method: "POST" }).catch(() => {});
    }
    sendPresence();
    const heartbeat = setInterval(sendPresence, 30000);

    function onPresence(e) {
      const { userId, name } = e.detail || {};
      if (!userId || userId === myUserIdRef.current) return;
      presenceRef.current[userId] = { name, ts: Date.now() };
      updateActiveUsers();
    }
    function updateActiveUsers() {
      const now = Date.now();
      setActiveUsers(
        Object.values(presenceRef.current)
          .filter(p => now - p.ts < 90000)
          .map(p => p.name)
      );
    }
    const cleanup = setInterval(updateActiveUsers, 20000);

    window.addEventListener("esg:klasseliste:presence", onPresence);
    return () => {
      clearInterval(heartbeat);
      clearInterval(cleanup);
      window.removeEventListener("esg:klasseliste:presence", onPresence);
    };
  }, []);

  // Echtzeit-Sync: WS-Broadcast von anderen Nutzern
  useEffect(() => {
    async function onWsUpdate(e) {
      const { action, list, id } = e.detail || {};
      if (action === "deleted") {
        setLists(prev => {
          const next = prev.filter(l => l.id !== id);
          setActiveId(cur => next.find(l => l.id === cur) ? cur : next[0]?.id || null);
          return next;
        });
      } else if (action === "created" && list) {
        const enriched = { ...list, columns: (list.columns||[]).map(c=>({...c,type:c.type||"check"})) };
        setLists(prev => prev.some(l => l.id === enriched.id) ? prev : [...prev, enriched]);
      } else if (action === "updated" && list) {
        const enriched = { ...list, columns: (list.columns||[]).map(c=>({...c,type:c.type||"check"})) };
        setLists(prev => prev.map(l => l.id === enriched.id ? enriched : l));
      }
    }
    window.addEventListener("esg:klasseliste", onWsUpdate);
    return () => window.removeEventListener("esg:klasseliste", onWsUpdate);
  }, []);

  async function loadLists() {
    setLoading(true);
    try {
      let data = await apiFetch("/api/klasselisten");
      if (!data || data.length === 0) {
        const created = await apiFetch("/api/klasselisten", {
          method: "POST",
          body: JSON.stringify({
            name: "5d",
            columns: [
              { id: genId(), title: "Abgabe 1",    type: "check" },
              { id: genId(), title: "Abgabe 2",    type: "check" },
              { id: genId(), title: "Hausaufgabe", type: "check" },
            ],
            students: STUDENTS_5D,
          }),
        });
        data = [created];
      }
      const enriched = data.map(l => ({
        ...l,
        columns: (l.columns || []).map(c => ({ ...c, type: c.type || "check" })),
      }));
      setLists(enriched);
      setActiveId(enriched[0].id);
    } catch(e) { console.error("Klasseliste:", e); }
    finally { setLoading(false); }
  }

  const activeList = lists.find(l => l.id === activeId) || null;

  function updateLocal(patch) {
    setLists(ls => ls.map(l => l.id === activeId ? { ...l, ...patch } : l));
  }

  async function patchRemote(patch) {
    try {
      const updated = await apiFetch(`/api/klasselisten/${activeId}`, {
        method: "PATCH", body: JSON.stringify(patch),
      });
      setLists(ls => ls.map(l => l.id === activeId
        ? { ...updated, columns: (updated.columns||[]).map(c=>({...c,type:c.type||"check"})) }
        : l
      ));
    } catch(e) { console.error(e); }
  }

  async function toggleCheck(si, colId) {
    if (!activeList) return;
    const key = `${si}:${colId}`;
    const col = (activeList.columns || []).find(c => c.id === colId);
    const wasComplete = col?.type !== "date" && (activeList.students || []).every((_, i) => !!(activeList.checks || {})[`${i}:${colId}`]);
    const checks = { ...(activeList.checks || {}), [key]: !activeList.checks?.[key] };
    const isComplete = col?.type !== "date" && (activeList.students || []).length > 0 &&
      (activeList.students || []).every((_, i) => !!checks[`${i}:${colId}`]);
    updateLocal({ checks });
    if (!wasComplete && isComplete) triggerConfetti(col?.title);
    try {
      await apiFetch(`/api/klasselisten/${activeId}`, { method: "PATCH", body: JSON.stringify({ checks }) });
    } catch(e) { updateLocal({ checks: activeList.checks }); }
  }

  async function setDateValue(si, colId, value) {
    if (!activeList) return;
    const key = `${si}:${colId}`;
    const checks = { ...(activeList.checks || {}), [key]: value || null };
    updateLocal({ checks });
    try {
      await apiFetch(`/api/klasselisten/${activeId}`, { method: "PATCH", body: JSON.stringify({ checks }) });
    } catch(e) { updateLocal({ checks: activeList.checks }); }
  }

  async function toggleAllCol(colId) {
    if (!activeList) return;
    const allChecked = students.every((_, si) => !!checks[`${si}:${colId}`]);
    const newChecks  = { ...checks };
    students.forEach((_, si) => { newChecks[`${si}:${colId}`] = !allChecked; });
    updateLocal({ checks: newChecks });
    try {
      await apiFetch(`/api/klasselisten/${activeId}`, { method: "PATCH", body: JSON.stringify({ checks: newChecks }) });
    } catch(e) { updateLocal({ checks: activeList.checks }); }
  }

  async function addColumn() {
    if (!activeList) return;
    const col = { id: genId(), title: `Spalte ${(activeList.columns||[]).length+1}`, type: "check" };
    const columns = [...(activeList.columns||[]), col];
    updateLocal({ columns }); patchRemote({ columns });
  }

  async function removeColumn(colId) {
    if (!activeList) return;
    const columns = (activeList.columns||[]).filter(c => c.id !== colId);
    const checks = Object.fromEntries(
      Object.entries(activeList.checks||{}).filter(([k]) => !k.endsWith(`:${colId}`))
    );
    updateLocal({ columns, checks }); patchRemote({ columns, checks });
  }

  async function finishInlineRename() {
    if (!inlineCol || !activeList) { setInlineCol(null); return; }
    const columns = (activeList.columns||[]).map(c =>
      c.id === inlineCol.id ? { ...c, title: inlineCol.title } : c
    );
    updateLocal({ columns }); patchRemote({ columns });
    setInlineCol(null);
  }

  async function handleCreate(data) {
    const created = await apiFetch("/api/klasselisten", {
      method: "POST", body: JSON.stringify(data),
    });
    const enriched = { ...created, columns: (created.columns||[]).map(c=>({...c,type:c.type||"check"})) };
    setLists(ls => [...ls, enriched]);
    setActiveId(created.id);
  }

  async function handleEdit(patch) { updateLocal(patch); await patchRemote(patch); }

  async function handleDelete() {
    if (!activeList) return;
    try {
      await apiFetch(`/api/klasselisten/${activeId}`, { method: "DELETE" });
      const remaining = lists.filter(l => l.id !== activeId);
      setLists(remaining);
      setActiveId(remaining[0]?.id || null);
      setModal(null);
    } catch(e) { console.error(e); }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  if (loading) return h("div", { className: "kl-loading" },
    h("div", { className: "kl-spinner" }), "Wird geladen…"
  );

  if (!activeList && lists.length === 0) return h("div", { className: "kl-empty" },
    h("div", { className: "kl-empty-icon" }, "📋"),
    h("p", null, "Noch keine Klasseliste."),
    h("button", { className: "btn btn-primary", onClick: () => setModal("create") }, "+ Neue Liste")
  );

  if (!activeList) return null;

  const cols     = activeList.columns  || [];
  const students = activeList.students || [];
  const checks   = activeList.checks   || {};

  // Feature 5: Pendientes filter
  const visibleStudents = showPending
    ? students.filter((_, si) => cols.some(col => {
        const v = checks[`${si}:${col.id}`];
        return col.type === "date" ? !(v && typeof v === "string") : !v;
      }))
    : students;

  return h("div", { className: "kl-screen" },

    // ── Presence bar ────────────────────────────────────────────────────────
    activeUsers.length > 0 && h("div", { className: "kl-presence-bar" },
      h("span", { className: "kl-presence-dot" }),
      activeUsers.length === 1
        ? `${activeUsers[0]} ist gerade aktiv`
        : `${activeUsers.join(", ")} sind gerade aktiv`
    ),

    // ── Header ──────────────────────────────────────────────────────────────
    h("div", { className: "kl-header" },
      h("div", { className: "kl-tabs" },
        lists.map(l => h("button", {
          key: l.id,
          className: `kl-tab${l.id === activeId ? " on" : ""}`,
          onClick: () => setActiveId(l.id),
        }, "Klasse ", l.name)),
        h("button", { className: "kl-tab kl-tab-new", onClick: () => setModal("create"), title: "Neue Liste" }, "+")
      ),
      h("div", { className: "kl-header-row" },
        h("span", { className: "kl-student-count" }, `${visibleStudents.length} von ${students.length} Schüler·innen`),
        h("div", { className: "kl-action-group" },
          h("button", {
            className: `btn btn-soft btn-sm${showPending ? " kl-filter-active" : ""}`,
            onClick: () => setShowPending(p => !p),
            title: showPending ? "Alle anzeigen" : "Nur Ausstehende anzeigen",
          }, showPending ? "⚠️ Fehlend" : "⚠️ Fehlend"),
          h("button", { className: "btn btn-soft btn-sm", onClick: () => setModal("edit") }, "✏️ Bearbeiten"),
          h("div", { className: "kl-share-wrap" },
            h("button", {
              className: "btn btn-soft btn-sm",
              onClick: () => setModal(modal === "share" ? null : "share"),
            }, "↑ Teilen"),
            modal === "share" && h(ShareMenu, {
              list: activeList,
              onClose: () => setModal(null),
              onOpenChatModal: () => setModal("sendchat"),
            })
          ),
          h("button", {
            className: "btn btn-soft btn-sm kl-del-btn",
            onClick: () => setModal("delete"),
            title: "Liste löschen",
          }, "🗑️")
        )
      )
    ),

    // ── Table ───────────────────────────────────────────────────────────────
    h("div", { className: "kl-table-wrap" },
      h("div", { className: "kl-table-card" },
        h("table", { className: "kl-table" },
          h("thead", null,
            h("tr", null,
              h("th", { className: "kl-th kl-th-name" }, "Name"),
              cols.map(col => h("th", { key: col.id, className: "kl-th" },
                h("div", { className: "kl-th-inner" },
                  col.type === "date" && h("span", { className: "kl-col-type-badge" }, "📅"),
                  inlineCol && inlineCol.id === col.id
                    ? h("input", {
                        className: "kl-col-input", value: inlineCol.title, autoFocus: true,
                        onChange: e => setInlineCol({ ...inlineCol, title: e.target.value }),
                        onBlur: finishInlineRename,
                        onKeyDown: e => { if (e.key==="Enter") finishInlineRename(); if (e.key==="Escape") setInlineCol(null); },
                        onClick: e => e.stopPropagation(),
                      })
                    : h("span", {
                        className: "kl-col-title",
                        onClick: () => setInlineCol({ id: col.id, title: col.title }),
                        title: "Umbenennen",
                      }, col.title),
                  h("button", { className: "kl-col-del", onClick: () => removeColumn(col.id), title: "Entfernen" }, "×"),
                  col.type !== "date" && h("button", {
                    className: `kl-all-btn${students.length > 0 && students.every((_, si) => !!checks[`${si}:${col.id}`]) ? " full" : ""}`,
                    onClick: e => { e.stopPropagation(); toggleAllCol(col.id); },
                    title: "Alle markieren / abwählen",
                  }, students.length > 0 && students.every((_, si) => !!checks[`${si}:${col.id}`]) ? "− Alle" : "+ Alle")
                )
              )),
              h("th", { className: "kl-th kl-th-add" },
                h("button", { className: "kl-add-col-btn", onClick: addColumn, title: "Spalte hinzufügen" }, "+")
              )
            ),
            h("tr", { className: "kl-progress-row" },
              h("td", { className: "kl-td kl-td-name kl-td-prog-label" }, "Fortschritt"),
              cols.map(col => {
                const vals = students.map((_, si) => checks[`${si}:${col.id}`]);
                const done = col.type === "date"
                  ? vals.filter(v => v && typeof v === "string").length
                  : vals.filter(Boolean).length;
                const pct = students.length ? Math.round(done/students.length*100) : 0;
                return h("td", { key: col.id, className: "kl-td kl-td-prog" },
                  h("div", { className: "kl-prog" },
                    h("span", { className: done===students.length && students.length>0 ? "kl-prog-num kl-prog-full" : "kl-prog-num" },
                      `${done}/${students.length}`
                    ),
                    h("div", { className: "kl-prog-track" },
                      h("div", { className: "kl-prog-fill", style: { width: students.length ? `${pct}%` : "0%" } })
                    )
                  )
                );
              }),
              h("td", null)
            )
          ),
          h("tbody", null,
            visibleStudents.map((name) => {
              const si = students.indexOf(name);
              return h("tr", { key: si, className: "kl-row" },
                h("td", { className: "kl-td kl-td-name" }, name),
                cols.map(col => {
                  const key = `${si}:${col.id}`;
                  if (col.type === "date") {
                    const val = typeof checks[key] === "string" ? checks[key] : "";
                    return h("td", { key: col.id, className: "kl-td kl-td-check" },
                      h("input", {
                        type: "date",
                        className: `kl-date-input${val ? " has-value" : ""}`,
                        value: val,
                        onChange: e => setDateValue(si, col.id, e.target.value),
                      })
                    );
                  }
                  const checked = !!checks[key];
                  return h("td", { key: col.id, className: "kl-td kl-td-check" },
                    h("label", { className: `kl-checkbox${checked ? " checked" : ""}` },
                      h("input", { type: "checkbox", checked, onChange: () => toggleCheck(si, col.id) }),
                      h("span", { className: "kl-checkmark" }, checked ? "✓" : "")
                    )
                  );
                }),
                h("td", null)
              );
            })
          )
        )
      )
    ),

    // ── Modals ──────────────────────────────────────────────────────────────
    modal === "create"   && h(CreateListModal, { onClose: () => setModal(null), onCreate: handleCreate }),
    modal === "edit"     && h(EditModal, { list: activeList, onClose: () => setModal(null), onSave: handleEdit }),
    modal === "sendchat" && h(SendChatModal, { list: activeList, onClose: () => setModal(null) }),
    modal === "delete"   && h("div", { className: "kl-modal-backdrop" },
      h("div", { className: "kl-modal kl-modal-sm" },
        h("div", { className: "kl-modal-header" },
          h("h2", { className: "kl-modal-title" }, "🗑️ Liste löschen")
        ),
        h("div", { className: "kl-modal-body" },
          h("p", { style: { margin: 0, color: "var(--text-2)", lineHeight: 1.5 } },
            `Klasse ${activeList.name} wirklich löschen? Alle Daten gehen verloren.`
          )
        ),
        h("div", { className: "kl-modal-footer" },
          h("button", { className: "btn", onClick: () => setModal(null) }, "Abbrechen"),
          h("button", { className: "btn btn-danger", onClick: handleDelete }, "Löschen")
        )
      )
    )
  );
}

window.KlasselisteScreen = KlasselisteScreen;
})();
