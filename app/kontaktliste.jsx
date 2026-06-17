// app/kontaktliste.jsx — Kontaktliste Klasse 5d
(function () {
"use strict";
const { useState, useMemo } = React;
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

function TelLink({ number }) {
  if (!number) return h("span", { className: "kl-no-data" }, "—");
  const clean = number.replace(/\s/g, "");
  return h("a", { className: "kl-tel", href: `tel:${clean}` }, number);
}

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return KONTAKTE_5D;
    return KONTAKTE_5D.filter(s =>
      `${s.nachname} ${s.vorname}`.toLowerCase().includes(q) ||
      (s.sonstiges || "").toLowerCase().includes(q) ||
      ((extras[s.nachname]?.adresse || s.adresse) || "").toLowerCase().includes(q)
    );
  }, [search, extras]);

  const hasWarning = s => /⚠️/.test(s.sonstiges) || /⚠️/.test(extras[s.nachname]?.sonstiges || "");

  return h("div", { className: "klk-screen" },

    // ── Header ────────────────────────────────────────────────────────────────
    h("div", { className: "klk-header" },
      h("div", { className: "klk-header-top" },
        h("h1", { className: "klk-title" }, "Kontaktliste — Klasse 5d"),
        h("span", { className: "klk-count" }, `${filtered.length} von ${KONTAKTE_5D.length} Schüler·innen`)
      ),
      h("div", { className: "klk-search-wrap" },
        h("span", { className: "klk-search-icon" }, "🔍"),
        h("input", {
          className: "klk-search",
          placeholder: "Namen, Adresse, Notiz suchen…",
          value: search,
          onChange: e => setSearch(e.target.value),
        })
      )
    ),

    // ── Table ─────────────────────────────────────────────────────────────────
    h("div", { className: "klk-table-wrap" },
      h("table", { className: "klk-table" },
        h("thead", null,
          h("tr", null,
            h("th", { className: "klk-th klk-th-name" }, "Name"),
            h("th", { className: "klk-th" }, "📱 Tel. Mutter"),
            h("th", { className: "klk-th" }, "📱 Tel. Vater"),
            h("th", { className: "klk-th klk-th-addr" }, "🏠 Adresse"),
            h("th", { className: "klk-th klk-th-notes" }, "📝 Sonstiges"),
            h("th", { className: "klk-th klk-th-edit" }, "")
          )
        ),
        h("tbody", null,
          filtered.map(s => {
            const ex = extras[s.nachname] || {};
            const adresse   = ex.adresse   ?? s.adresse;
            const sonstiges = ex.sonstiges ?? s.sonstiges;
            const isEdit    = editId === s.nachname;
            const warn      = hasWarning({ sonstiges, ...s });

            return h("tr", { key: s.nachname, className: `klk-row${warn ? " klk-warn" : ""}` },
              // Name
              h("td", { className: "klk-td klk-td-name" },
                h("div", { className: "klk-name" },
                  h("span", { className: "klk-nachname" }, s.nachname + ","),
                  h("span", { className: "klk-vorname" }, " " + s.vorname)
                )
              ),
              // Tel Mutter
              h("td", { className: "klk-td" }, h(TelLink, { number: s.telMutter })),
              // Tel Vater
              h("td", { className: "klk-td" }, h(TelLink, { number: s.telVater })),
              // Adresse
              h("td", { className: "klk-td klk-td-addr" },
                isEdit
                  ? h("input", {
                      className: "klk-edit-input",
                      defaultValue: adresse,
                      placeholder: "Adresse…",
                      onBlur: e => saveExtra(s.nachname, { adresse: e.target.value }),
                    })
                  : adresse
                    ? h("span", null, adresse)
                    : h("span", { className: "kl-no-data" }, "—")
              ),
              // Sonstiges
              h("td", { className: "klk-td klk-td-notes" },
                isEdit
                  ? h("input", {
                      className: "klk-edit-input",
                      defaultValue: sonstiges,
                      placeholder: "Allergien, Krankheiten…",
                      onBlur: e => saveExtra(s.nachname, { sonstiges: e.target.value }),
                    })
                  : sonstiges
                    ? h("span", { className: warn ? "klk-warn-text" : "" }, sonstiges)
                    : h("span", { className: "kl-no-data" }, "—")
              ),
              // Edit button
              h("td", { className: "klk-td klk-td-edit" },
                h("button", {
                  className: `klk-edit-btn${isEdit ? " active" : ""}`,
                  onClick: () => setEditId(isEdit ? null : s.nachname),
                  title: isEdit ? "Fertig" : "Adresse / Notiz bearbeiten",
                }, isEdit ? "✓" : "✏️")
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
