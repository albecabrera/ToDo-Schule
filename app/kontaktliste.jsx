// app/kontaktliste.jsx — Kontaktliste Klasse 5d
(function () {
"use strict";
const { useState, useMemo, useRef } = React;
const h = React.createElement;

const KONTAKTE_5D = [
  { nachname:"Almakharzi",      vorname:"Talya",            telMutter:"017661061901",  telVater:"",             adresse:"", sonstiges:"" },
  { nachname:"Azoualesei",      vorname:"Peri Akoun",       telMutter:"01634193933",   telVater:"017620628965", adresse:"", sonstiges:"Mutter spricht kein Deutsch, nur Englisch (schwer verständlich)" },
  { nachname:"Behlert",         vorname:"Luna Mia",         telMutter:"0228/3827125",  telVater:"",             adresse:"Hohler Weg 5, 53343 Wachtberg", sonstiges:"Heimkind (Heimbetreuerin: Patricia Weyres)" },
  { nachname:"Berger",          vorname:"Mio",              telMutter:"0176 38636207", telVater:"017631215545", adresse:"", sonstiges:"" },
  { nachname:"Brenig",          vorname:"Melissa",          telMutter:"015730617953",  telVater:"017620590463", adresse:"", sonstiges:"" },
  { nachname:"Chebli",          vorname:"Reihan Rawan",     telMutter:"01622124338",   telVater:"",             adresse:"", sonstiges:"" },
  { nachname:"Crismaru",        vorname:"Sofia-Elena",      telMutter:"0151 24863786", telVater:"0151 63556239",adresse:"", sonstiges:"Muttersprache Rumänisch; Vater spricht kein Deutsch (aber Englisch)" },
  { nachname:"El Mehdaoui",     vorname:"Mehdi",            telMutter:"0176/20372440", telVater:"0176/22762221",adresse:"", sonstiges:"" },
  { nachname:"Faeq",            vorname:"Warin",            telMutter:"017624609235",  telVater:"017632107032", adresse:"", sonstiges:"Muttersprache Kurdisch" },
  { nachname:"Hamza",           vorname:"Hazim",            telMutter:"",              telVater:"01781537874",  adresse:"", sonstiges:"⚠️ Asthma" },
  { nachname:"Hassan",          vorname:"Liliana",          telMutter:"017676897326",  telVater:"",             adresse:"", sonstiges:"Muttersprache Kurdisch" },
  { nachname:"Heuskel",         vorname:"Raphael Joachim",  telMutter:"",              telVater:"01794736201",  adresse:"", sonstiges:"Muttersprache Polnisch" },
  { nachname:"Jawad",           vorname:"Armaghan",         telMutter:"",              telVater:"",             adresse:"", sonstiges:"" },
  { nachname:"Juneja",          vorname:"Nivaan",           telMutter:"015213762297",  telVater:"",             adresse:"", sonstiges:"Muttersprache Hindi" },
  { nachname:"Kahramanoglu",    vorname:"Safiya",           telMutter:"",              telVater:"",             adresse:"", sonstiges:"Mutter alleinerziehend; Arabisch, Englisch, Deutsch" },
  { nachname:"Kassim",          vorname:"Adam",             telMutter:"0176 41364306", telVater:"",             adresse:"", sonstiges:"" },
  { nachname:"Khalil",          vorname:"Sevdar",           telMutter:"01791347172",   telVater:"",             adresse:"", sonstiges:"Muttersprache Kurdisch; Mutter spricht gebrochen Deutsch" },
  { nachname:"Kirchhoff",       vorname:"Mika",             telMutter:"01775472684",   telVater:"",             adresse:"", sonstiges:"⚠️ LRS + ADS (Medikamente Mo–Fr)" },
  { nachname:"Laffin",          vorname:"Eneas Thomas",     telMutter:"",              telVater:"01622134422",  adresse:"", sonstiges:"" },
  { nachname:"Majidzada",       vorname:"Zohal",            telMutter:"01727731243",   telVater:"",             adresse:"", sonstiges:"Gebrochenes Deutsch / Dari" },
  { nachname:"Morhj",           vorname:"Amira",            telMutter:"",              telVater:"01773327717",  adresse:"", sonstiges:"Muttersprache Arabisch" },
  { nachname:"Ndreu",           vorname:"Arteo",            telMutter:"01789682712",   telVater:"015734059254", adresse:"", sonstiges:"Muttersprache Albanisch; Vater: schlechtes Deutsch" },
  { nachname:"Nemr",            vorname:"Paulo",            telMutter:"0157 36222789", telVater:"017661734352", adresse:"", sonstiges:"Ägyptisch-Arabisch und Deutsch" },
  { nachname:"Pala-Maftei",     vorname:"Edanur",           telMutter:"017661369051",  telVater:"",             adresse:"", sonstiges:"⚠️ Diabetes und Cholesterin" },
  { nachname:"Proshutia",       vorname:"Vira",             telMutter:"",              telVater:"",             adresse:"", sonstiges:"" },
  { nachname:"Salehi",          vorname:"Shukran",          telMutter:"015259763988",  telVater:"016090909891", adresse:"", sonstiges:"⚠️ Allergie auf Bienenstiche!" },
  { nachname:"Staszko",         vorname:"Noah",             telMutter:"015143101172",  telVater:"",             adresse:"", sonstiges:"Ungarisch / Deutsch" },
  { nachname:"Tallouz",         vorname:"Hanin K. M. M.",   telMutter:"",              telVater:"017683242428", adresse:"", sonstiges:"Arabisch / Deutsch" },
];

// Returns merged data: base fields + extras overrides
function mergeKontakt(s, ex) {
  const telMutterArr = ex.telMutterArr ?? (s.telMutter ? [s.telMutter] : []);
  const telVaterArr  = ex.telVaterArr  ?? (s.telVater  ? [s.telVater]  : []);
  return {
    ...s,
    mutterName:  ex.mutterName  ?? "",
    vaterName:   ex.vaterName   ?? "",
    telMutterArr,
    telVaterArr,
    adresse:     ex.adresse     ?? s.adresse,
    sonstiges:   ex.sonstiges   ?? s.sonstiges,
  };
}

function TelList({ numbers }) {
  if (!numbers || numbers.length === 0) return h("span", { className: "kl-no-data" }, "—");
  return h("div", { className: "klk-tel-list" },
    numbers.map((n, i) => {
      const clean = n.replace(/\s/g, "");
      return h("a", { key: i, className: "kl-tel", href: `tel:${clean}` }, n);
    })
  );
}

/* ── Edit Modal ─────────────────────────────────────────────────────────── */
function EditModal({ kontakt, onSave, onClose }) {
  const [mutterName,  setMutterName]  = useState(kontakt.mutterName);
  const [vaterName,   setVaterName]   = useState(kontakt.vaterName);
  const [telMutterArr,setTelMutterArr]= useState([...kontakt.telMutterArr]);
  const [telVaterArr, setTelVaterArr] = useState([...kontakt.telVaterArr]);
  const [adresse,     setAdresse]     = useState(kontakt.adresse);
  const [sonstiges,   setSonstiges]   = useState(kontakt.sonstiges);

  function addTel(list, setList) {
    setList([...list, ""]);
  }
  function updateTel(list, setList, i, val) {
    const next = [...list];
    next[i] = val;
    setList(next);
  }
  function removeTel(list, setList, i) {
    setList(list.filter((_, j) => j !== i));
  }

  function handleSave() {
    onSave({
      mutterName: mutterName.trim(),
      vaterName:  vaterName.trim(),
      telMutterArr: telMutterArr.map(t => t.trim()).filter(Boolean),
      telVaterArr:  telVaterArr.map(t => t.trim()).filter(Boolean),
      adresse:    adresse.trim(),
      sonstiges:  sonstiges.trim(),
    });
    onClose();
  }

  function TelInputs({ label, list, setList }) {
    return h("div", { className: "klk-modal-field" },
      h("label", { className: "klk-modal-label" }, label),
      list.map((n, i) =>
        h("div", { key: i, className: "klk-tel-row" },
          h("input", {
            className: "klk-modal-input klk-tel-input",
            value: n,
            placeholder: "+49 …",
            onChange: e => updateTel(list, setList, i, e.target.value),
          }),
          h("button", {
            className: "klk-tel-remove",
            onClick: () => removeTel(list, setList, i),
            title: "Entfernen",
          }, "×")
        )
      ),
      h("button", { className: "klk-tel-add", onClick: () => addTel(list, setList) },
        "+ Nummer hinzufügen"
      )
    );
  }

  return h("div", { className: "modal", onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h("div", { className: "klk-modal-card" },
      h("div", { className: "klk-modal-head" },
        h("span", null, `✏️ ${kontakt.nachname}, ${kontakt.vorname}`),
        h("button", { className: "iconbtn", onClick: onClose, "aria-label": "Schließen" },
          h("span", null, "×")
        )
      ),

      h("div", { className: "klk-modal-body" },

        // Mutter section
        h("div", { className: "klk-modal-section" },
          h("div", { className: "klk-modal-section-title" }, "👩 Mutter"),
          h("div", { className: "klk-modal-field" },
            h("label", { className: "klk-modal-label" }, "Name (Vor- und Nachname)"),
            h("input", {
              className: "klk-modal-input",
              value: mutterName,
              placeholder: "z. B. Maria García",
              onChange: e => setMutterName(e.target.value),
            })
          ),
          h(TelInputs, { label: "Telefonnummern", list: telMutterArr, setList: setTelMutterArr })
        ),

        // Vater section
        h("div", { className: "klk-modal-section" },
          h("div", { className: "klk-modal-section-title" }, "👨 Vater"),
          h("div", { className: "klk-modal-field" },
            h("label", { className: "klk-modal-label" }, "Name (Vor- und Nachname)"),
            h("input", {
              className: "klk-modal-input",
              value: vaterName,
              placeholder: "z. B. Carlos García",
              onChange: e => setVaterName(e.target.value),
            })
          ),
          h(TelInputs, { label: "Telefonnummern", list: telVaterArr, setList: setTelVaterArr })
        ),

        // Adresse & Sonstiges
        h("div", { className: "klk-modal-section" },
          h("div", { className: "klk-modal-section-title" }, "🏠 Adresse & Notizen"),
          h("div", { className: "klk-modal-field" },
            h("label", { className: "klk-modal-label" }, "Adresse"),
            h("input", {
              className: "klk-modal-input",
              value: adresse,
              placeholder: "Straße, PLZ Ort",
              onChange: e => setAdresse(e.target.value),
            })
          ),
          h("div", { className: "klk-modal-field" },
            h("label", { className: "klk-modal-label" }, "Sonstiges / Allergien"),
            h("textarea", {
              className: "klk-modal-textarea",
              value: sonstiges,
              placeholder: "Allergien, Krankheiten, Sprache…",
              rows: 3,
              onChange: e => setSonstiges(e.target.value),
            })
          )
        )
      ),

      h("div", { className: "klk-modal-foot" },
        h("button", { className: "klk-modal-cancel", onClick: onClose }, "Abbrechen"),
        h("button", { className: "klk-modal-save", onClick: handleSave }, "Speichern")
      )
    )
  );
}

/* ── Main view ─────────────────────────────────────────────────────────── */
function KontaktlisteView() {
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [extras, setExtras] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kl-extras-5d") || "{}"); } catch { return {}; }
  });

  function saveExtra(nachname, patch) {
    const next = { ...extras, [nachname]: { ...(extras[nachname] || {}), ...patch } };
    setExtras(next);
    localStorage.setItem("kl-extras-5d", JSON.stringify(next));
  }

  const merged = useMemo(() =>
    KONTAKTE_5D.map(s => mergeKontakt(s, extras[s.nachname] || {})),
    [extras]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return merged;
    return merged.filter(s =>
      `${s.nachname} ${s.vorname}`.toLowerCase().includes(q) ||
      (s.mutterName || "").toLowerCase().includes(q) ||
      (s.vaterName  || "").toLowerCase().includes(q) ||
      (s.sonstiges  || "").toLowerCase().includes(q) ||
      (s.adresse    || "").toLowerCase().includes(q) ||
      s.telMutterArr.some(t => t.includes(q)) ||
      s.telVaterArr.some(t => t.includes(q))
    );
  }, [search, merged]);

  const editKontakt = editId ? merged.find(s => s.nachname === editId) : null;
  const hasWarning = s => /⚠️/.test(s.sonstiges || "");

  return h("div", { className: "klk-screen" },

    editKontakt && h(EditModal, {
      kontakt: editKontakt,
      onSave: patch => saveExtra(editKontakt.nachname, patch),
      onClose: () => setEditId(null),
    }),

    // Header
    h("div", { className: "klk-header" },
      h("div", { className: "klk-header-top" },
        h("h1", { className: "klk-title" }, "Kontaktliste — Klasse 5d"),
        h("span", { className: "klk-count" }, `${filtered.length} von ${KONTAKTE_5D.length} Schüler·innen`)
      ),
      h("div", { className: "klk-search-wrap" },
        h("span", { className: "klk-search-icon" }, "🔍"),
        h("input", {
          className: "klk-search",
          placeholder: "Namen, Adresse, Telefon, Notiz suchen…",
          value: search,
          onChange: e => setSearch(e.target.value),
        })
      )
    ),

    // Table
    h("div", { className: "klk-table-wrap" },
      h("table", { className: "klk-table" },
        h("thead", null,
          h("tr", null,
            h("th", { className: "klk-th klk-th-name" }, "Name"),
            h("th", { className: "klk-th" }, "👩 Mutter"),
            h("th", { className: "klk-th" }, "👨 Vater"),
            h("th", { className: "klk-th klk-th-addr" }, "🏠 Adresse"),
            h("th", { className: "klk-th klk-th-notes" }, "📝 Sonstiges"),
            h("th", { className: "klk-th klk-th-edit" }, "")
          )
        ),
        h("tbody", null,
          filtered.map(s => {
            const warn = hasWarning(s);
            return h("tr", { key: s.nachname, className: `klk-row${warn ? " klk-warn" : ""}` },

              // Name
              h("td", { className: "klk-td klk-td-name" },
                h("div", { className: "klk-name" },
                  h("span", { className: "klk-nachname" }, s.nachname + ","),
                  h("span", { className: "klk-vorname" }, " " + s.vorname)
                )
              ),

              // Mutter
              h("td", { className: "klk-td" },
                h("div", { className: "klk-contact-cell" },
                  s.mutterName && h("div", { className: "klk-contact-name" }, s.mutterName),
                  h(TelList, { numbers: s.telMutterArr })
                )
              ),

              // Vater
              h("td", { className: "klk-td" },
                h("div", { className: "klk-contact-cell" },
                  s.vaterName && h("div", { className: "klk-contact-name" }, s.vaterName),
                  h(TelList, { numbers: s.telVaterArr })
                )
              ),

              // Adresse
              h("td", { className: "klk-td klk-td-addr" },
                s.adresse
                  ? h("span", null, s.adresse)
                  : h("span", { className: "kl-no-data" }, "—")
              ),

              // Sonstiges
              h("td", { className: "klk-td klk-td-notes" },
                s.sonstiges
                  ? h("span", { className: warn ? "klk-warn-text" : "" }, s.sonstiges)
                  : h("span", { className: "kl-no-data" }, "—")
              ),

              // Edit
              h("td", { className: "klk-td klk-td-edit" },
                h("button", {
                  className: "klk-edit-btn",
                  onClick: () => setEditId(s.nachname),
                  title: "Kontakt bearbeiten",
                }, "✏️")
              )
            );
          })
        )
      )
    )
  );
}

window.KontaktlisteView = KontaktlisteView;
})();
