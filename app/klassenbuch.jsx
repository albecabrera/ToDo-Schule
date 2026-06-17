// app/klassenbuch.jsx — Klassenbuch (digitales Tagebuch)
(function () {
"use strict";
const { useState, useEffect, useRef } = React;
const h = React.createElement;

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

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

function fmtDateShort(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "2-digit",
    });
  } catch { return iso; }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── EntryForm ─────────────────────────────────────────────────────────────────
function EntryForm({ entry, students, listId, onSave, onCancel }) {
  const [date, setDate]       = useState(entry?.date || today());
  const [topic, setTopic]     = useState(entry?.topic || "");
  const [content, setContent] = useState(entry?.content || "");
  const [absenzen, setAbs]    = useState(() => new Set(entry?.absenzen || []));
  const [notizen, setNotizen] = useState(entry?.notizen || "");
  const [busy, setBusy]       = useState(false);

  function toggleAbs(name) {
    setAbs(prev => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return s;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        list_id: listId,
        entry_date: date,
        topic: topic.trim(),
        content: content.trim(),
        absenzen: [...absenzen],
        notizen: notizen.trim(),
      };
      let result;
      if (entry?.id) {
        result = await apiFetch(`/api/klassenbuch/${entry.id}`, {
          method: "PATCH", body: JSON.stringify(body),
        });
      } else {
        result = await apiFetch("/api/klassenbuch", {
          method: "POST", body: JSON.stringify(body),
        });
      }
      toast(entry?.id ? "Gespeichert" : "Eintrag erstellt", topic.trim() || fmtDateShort(date));
      onSave(result);
    } catch (err) {
      console.error(err);
      toast("Fehler", "Eintrag konnte nicht gespeichert werden.");
      setBusy(false);
    }
  }

  return h("form", { className: "kb-form", onSubmit: submit },
    h("div", { className: "kb-field" },
      h("label", { className: "kb-label" }, "Datum"),
      h("input", {
        type: "date", className: "kb-input", value: date,
        required: true, onChange: e => setDate(e.target.value),
      })
    ),
    h("div", { className: "kb-field" },
      h("label", { className: "kb-label" }, "Thema / Stunde"),
      h("input", {
        type: "text", className: "kb-input", value: topic, autoFocus: true,
        placeholder: "z. B. Pythagoras – Einführung", maxLength: 200,
        onChange: e => setTopic(e.target.value),
      })
    ),
    h("div", { className: "kb-field" },
      h("label", { className: "kb-label" }, "Unterrichtsinhalt"),
      h("textarea", {
        className: "kb-textarea", value: content, rows: 4,
        placeholder: "Was wurde gemacht? Hausaufgaben, Übungen, Seiten…",
        onChange: e => setContent(e.target.value),
      })
    ),
    students.length > 0 && h("div", { className: "kb-field" },
      h("label", { className: "kb-label" },
        `Fehlende Schüler·innen ${absenzen.size > 0 ? `(${absenzen.size})` : ""}`
      ),
      h("div", { className: "kb-abs-grid" },
        students.map(name =>
          h("label", {
            key: name,
            className: `kb-abs-chip${absenzen.has(name) ? " on" : ""}`,
          },
            h("input", {
              type: "checkbox",
              checked: absenzen.has(name),
              onChange: () => toggleAbs(name),
            }),
            name.split(",")[0].trim()
          )
        )
      )
    ),
    h("div", { className: "kb-field" },
      h("label", { className: "kb-label" }, "Notizen / Vorfälle"),
      h("textarea", {
        className: "kb-textarea", value: notizen, rows: 3,
        placeholder: "Besondere Vorkommnisse, Elterngespräche, Hausaufgaben…",
        onChange: e => setNotizen(e.target.value),
      })
    ),
    h("div", { className: "kb-form-footer" },
      h("button", { type: "button", className: "btn", onClick: onCancel }, "Abbrechen"),
      h("button", { type: "submit", className: "btn btn-primary", disabled: busy },
        busy ? "Speichern…" : (entry?.id ? "Speichern" : "Erstellen")
      )
    )
  );
}

// ── EntryDetail ───────────────────────────────────────────────────────────────
function EntryDetail({ entry, students, listId, onUpdated, onDeleted }) {
  const [editing, setEditing]   = useState(false);
  const [confirming, setConf]   = useState(false);
  const [busy, setBusy]         = useState(false);

  async function doDelete() {
    setBusy(true);
    try {
      await apiFetch(`/api/klassenbuch/${entry.id}`, { method: "DELETE" });
      toast("Gelöscht", entry.topic || fmtDateShort(entry.date));
      onDeleted(entry.id);
    } catch {
      toast("Fehler", "Löschen fehlgeschlagen.");
      setBusy(false);
    }
  }

  if (editing) {
    return h(EntryForm, {
      entry, students, listId,
      onSave: updated => { setEditing(false); onUpdated(updated); },
      onCancel: () => setEditing(false),
    });
  }

  return h("div", { className: "kb-detail" },
    h("div", { className: "kb-detail-hdr" },
      h("div", null,
        h("div", { className: "kb-detail-date" }, fmtDate(entry.date)),
        entry.topic && h("h2", { className: "kb-detail-topic" }, entry.topic),
      ),
      h("div", { className: "kb-detail-actions" },
        h("button", { className: "btn btn-soft btn-sm", onClick: () => setEditing(true) }, "✏️ Bearbeiten"),
        confirming
          ? h("div", { className: "kb-confirm-row" },
              h("span", { className: "kb-confirm-text" }, "Wirklich löschen?"),
              h("button", { className: "btn btn-danger btn-sm", disabled: busy, onClick: doDelete }, "Ja"),
              h("button", { className: "btn btn-sm", onClick: () => setConf(false) }, "Nein")
            )
          : h("button", {
              className: "btn btn-soft btn-sm", style: { color: "#ef4444" },
              onClick: () => setConf(true),
            }, "🗑️")
      )
    ),

    entry.content && h("div", { className: "kb-section" },
      h("div", { className: "kb-section-label" }, "Unterrichtsinhalt"),
      h("div", { className: "kb-section-body" }, entry.content)
    ),

    entry.absenzen?.length > 0 && h("div", { className: "kb-section" },
      h("div", { className: "kb-section-label" },
        `Fehlende Schüler·innen (${entry.absenzen.length})`
      ),
      h("div", { className: "kb-chips" },
        entry.absenzen.map(n => h("span", { key: n, className: "kb-chip kb-chip--absent" }, n))
      )
    ),

    entry.notizen && h("div", { className: "kb-section" },
      h("div", { className: "kb-section-label" }, "Notizen"),
      h("div", { className: "kb-section-body kb-section-body--note" }, entry.notizen)
    ),

    h("div", { className: "kb-section kb-meta" },
      h("span", null, `Erstellt von ${entry.userName}`),
      h("span", null, "·"),
      h("span", null, fmtDateShort(entry.createdAt?.slice(0,10) || entry.date))
    )
  );
}

// ── KlassenbuchView ───────────────────────────────────────────────────────────
function KlassenbuchView() {
  const [lists, setLists]         = useState([]);
  const [activeListId, setActive] = useState(null);
  const [entries, setEntries]     = useState([]);
  const [selected, setSelected]   = useState(null); // entry id or "new"
  const [loading, setLoading]     = useState(true);
  const [loadingE, setLoadingE]   = useState(false);

  const activeList = lists.find(l => l.id === activeListId) || null;
  const students   = activeList?.students || [];

  useEffect(() => {
    apiFetch("/api/klasselisten")
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setLists(arr);
        if (arr.length > 0) setActive(arr[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeListId) return;
    setLoadingE(true);
    setSelected(null);
    apiFetch(`/api/klassenbuch?list_id=${activeListId}`)
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoadingE(false));
  }, [activeListId]);

  const selectedEntry = selected === "new" ? null : entries.find(e => e.id === selected) || null;

  function handleSaved(entry) {
    setEntries(prev => {
      const exists = prev.find(e => e.id === entry.id);
      return exists
        ? prev.map(e => e.id === entry.id ? entry : e)
        : [entry, ...prev];
    });
    setSelected(entry.id);
  }

  function handleDeleted(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
    setSelected(null);
  }

  if (loading) return h("div", { className: "kb-loading" },
    h("div", { className: "kb-spinner" }), "Wird geladen…"
  );

  return h("div", { className: "kb-screen" },

    // ── Header ─────────────────────────────────────────────────────────────
    h("div", { className: "kb-header" },
      h("div", { className: "kb-header-top" },
        h("h1", { className: "kb-title" }, "📒 Klassenbuch"),
        h("button", {
          className: "btn btn-primary btn-sm",
          onClick: () => setSelected("new"),
        }, "+ Neuer Eintrag")
      ),
      lists.length > 1 && h("div", { className: "kb-tabs" },
        lists.map(l => h("button", {
          key: l.id,
          className: `kb-tab${l.id === activeListId ? " on" : ""}`,
          onClick: () => setActive(l.id),
        }, "Klasse ", l.name))
      )
    ),

    // ── Body ───────────────────────────────────────────────────────────────
    h("div", { className: "kb-body" },

      // Left: entry list
      h("div", { className: "kb-list-col" },
        loadingE
          ? h("div", { className: "kb-list-loading" }, "…")
          : entries.length === 0
          ? h("div", { className: "kb-empty-list" },
              h("span", { className: "kb-empty-icon" }, "📒"),
              h("p", null, "Noch keine Einträge."),
              h("button", {
                className: "btn btn-primary btn-sm",
                onClick: () => setSelected("new"),
              }, "+ Erster Eintrag")
            )
          : entries.map(e =>
              h("button", {
                key: e.id,
                className: `kb-entry-row${selected === e.id ? " on" : ""}`,
                onClick: () => setSelected(e.id),
              },
                h("div", { className: "kb-entry-date" }, fmtDateShort(e.date)),
                h("div", { className: "kb-entry-info" },
                  h("div", { className: "kb-entry-topic" }, e.topic || "(kein Thema)"),
                  h("div", { className: "kb-entry-meta" },
                    e.absenzen?.length > 0 && h("span", { className: "kb-entry-abs" },
                      `${e.absenzen.length} fehlend`
                    ),
                    h("span", { className: "kb-entry-author" }, e.userName)
                  )
                )
              )
            )
      ),

      // Right: detail or form
      h("div", { className: "kb-detail-col" },
        selected === "new"
          ? h(EntryForm, {
              entry: null, students, listId: activeListId,
              onSave: handleSaved,
              onCancel: () => setSelected(null),
            })
          : selectedEntry
          ? h(EntryDetail, {
              entry: selectedEntry, students, listId: activeListId,
              onUpdated: handleSaved,
              onDeleted: handleDeleted,
            })
          : h("div", { className: "kb-empty-detail" },
              h("span", { className: "kb-empty-icon" }, "📖"),
              h("p", null, "Eintrag auswählen oder neu erstellen"),
              h("button", {
                className: "btn btn-soft btn-sm",
                onClick: () => setSelected("new"),
              }, "+ Neuer Eintrag")
            )
      )
    )
  );
}

window.KlassenbuchView = KlassenbuchView;
})();
