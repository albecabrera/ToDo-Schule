// ========================================================================
//  ToDo-Schule — Notizen & Planungen (kollegiales Teilen)
// ========================================================================
(function(){
const {useState,useMemo} = React;
const {createElement:h,Fragment} = React;
const {TEAMS, USERS, ME} = window.ESG_DATA;

const KIND_META = {
  note: {icon:"📝", label:"Notiz"},
  plan: {icon:"📅", label:"Planung"},
};

function timeAgo(ts){
  if(!ts) return "";
  const d = new Date(String(ts).replace(" ","T"));
  const mins = Math.max(0, Math.round((Date.now()-d.getTime())/60000));
  if(mins < 60)   return `vor ${mins} Min.`;
  if(mins < 1440) return `vor ${Math.round(mins/60)} Std.`;
  return `vor ${Math.round(mins/1440)} Tg.`;
}

function teamOf(id){ return TEAMS.find(t=>t.id===id) || null; }

/* ── Markdown-Checklisten:  - [ ] offen   - [x] erledigt ─────────────── */
const CHECK_RE = /^\s*- \[( |x|X)\] (.*)$/;

function checklistStats(content){
  const lines = (content||"").split("\n");
  let total=0, done=0;
  for(const ln of lines){
    const m = ln.match(CHECK_RE);
    if(m){ total++; if(m[1].toLowerCase()==="x") done++; }
  }
  return {total, done};
}

/* Rendert Notiz-Inhalt; Checklist-Zeilen werden zu klickbaren Checkboxen,
   ein Klick toggelt [ ]/[x] direkt im Markdown und speichert. */
function NoteContent({note, onPatch, limit}){
  const lines = (note.content||"").split("\n");
  const shown = limit ? lines.slice(0,limit) : lines;
  return h("div",{className:"nc-content"},
    shown.map((ln,i)=>{
      const m = ln.match(CHECK_RE);
      if(!m) return ln.trim()==="" ? h("div",{key:i,className:"nc-gap"}) : h("div",{key:i,className:"nc-line"},ln);
      const done = m[1].toLowerCase()==="x";
      return h("label",{key:i,className:`nc-check${done?" done":""}`,onClick:e=>e.stopPropagation()},
        h("input",{type:"checkbox",checked:done,disabled:!onPatch,onChange:()=>{
          const next = [...lines];
          next[i] = ln.replace(/\[( |x|X)\]/, done ? "[ ]" : "[x]");
          onPatch({...note, content: next.join("\n")});
        }}),
        h("span",null,m[2])
      );
    }),
    limit && lines.length>limit && h("div",{className:"nc-more"},`… ${lines.length-limit} weitere Zeilen`)
  );
}

/* ── Karte ───────────────────────────────────────────────────────────── */
function NoteCard({note, onOpen, onPatch}){
  const team = teamOf(note.teamId);
  const meta = KIND_META[note.kind] || KIND_META.note;
  const {total,done} = checklistStats(note.content);
  return h("article",{className:"note-card",onClick:()=>onOpen(note),tabIndex:0,
    onKeyDown:e=>{ if(e.key==="Enter"&&e.target.tagName!=="INPUT") onOpen(note); }},
    h("div",{className:"nc-head"},
      h("span",{className:`nc-kind ${note.kind}`},meta.icon," ",meta.label),
      total>0 && h("span",{className:`nc-progress${done===total?" all-done":""}`},`✓ ${done}/${total}`),
      team
        ? h("span",{className:"nc-team",style:{background:team.color+"1c",color:team.color}},team.icon," ",team.name)
        : h("span",{className:"nc-team private"},"🔒 Privat")
    ),
    h("h3",{className:"nc-title"},note.title),
    h(NoteContent,{note,onPatch,limit:6}),
    h("div",{className:"nc-foot"},
      h("span",{className:"nc-author"},note.authorName || (USERS.find(u=>u.id===note.createdBy)||{}).name || "—"),
      h("span",{className:"nc-time"},timeAgo(note.updatedAt))
    )
  );
}

/* ── Editor (Modal) ──────────────────────────────────────────────────── */
function NoteEditor({note, onClose, onSave, onDelete}){
  const isNew = !note.id;
  const [title,setTitle]     = useState(note.title||"");
  const [content,setContent] = useState(note.content||"");
  const [kind,setKind]       = useState(note.kind||"note");
  const [teamId,setTeamId]   = useState(note.teamId??"");
  const [saving,setSaving]   = useState(false);
  const mine = isNew || note.createdBy===ME.id || !window.ESG_API.hasSession();

  async function save(){
    if(!title.trim()) return;
    setSaving(true);
    try{
      await onSave({...note, title:title.trim(), content, kind,
        teamId: teamId==="" ? null : Number(teamId)});
      onClose();
    }finally{ setSaving(false); }
  }

  return h("div",{className:"modal",onClick:e=>{ if(e.target===e.currentTarget) onClose(); }},
    h("div",{className:"modal-card wide note-editor"},
      h("div",{className:"modal-head"},
        h("h3",null,isNew?"Neue Notiz":"Bearbeiten"),
        h("div",{className:"sp"}),
        h("button",{className:"iconbtn",onClick:onClose,"aria-label":"Schließen"},h(Icon,{n:"x",size:17}))
      ),
      h("div",{className:"modal-body"},
        h("div",{className:"field"},
          h("label",null,"Titel"),
          h("input",{className:"input input-lg",value:title,autoFocus:isNew,
            placeholder:"z. B. UV-Planung Deutsch 8b",onChange:e=>setTitle(e.target.value)})
        ),
        h("div",{className:"row gap-12 note-meta-row"},
          h("div",{className:"field grow"},
            h("label",null,"Art"),
            h("div",{className:"seg"},
              Object.entries(KIND_META).map(([k,m])=>
                h("button",{key:k,type:"button",className:kind===k?"on":"",onClick:()=>setKind(k)},m.icon," ",m.label))
            )
          ),
          h("div",{className:"field grow"},
            h("label",null,"Teilen mit"),
            h("select",{className:"input",value:teamId,onChange:e=>setTeamId(e.target.value)},
              h("option",{value:""},"🔒 Privat (nur ich)"),
              TEAMS.filter(t=>t.id!==0).map(t=>h("option",{key:t.id,value:t.id},`${t.icon} ${t.name}`))
            )
          )
        ),
        h("div",{className:"field"},
          h("div",{className:"row",style:{justifyContent:"space-between",alignItems:"center"}},
            h("label",null,"Inhalt"),
            h("button",{type:"button",className:"btn btn-ghost btn-sm",
              title:"Checklisten-Zeile einfügen",
              onClick:()=>setContent(c=>(c?c.replace(/\n?$/,"\n"):"")+"- [ ] ")},
              "☑︎ Checkliste")
          ),
          h("textarea",{className:"input note-textarea",rows:12,value:content,
            placeholder:"Notizen, Material, Ablauf …\n\nChecklisten in Markdown:\n- [ ] offen\n- [x] erledigt",
            onChange:e=>setContent(e.target.value),
            onKeyDown:e=>{ if((e.metaKey||e.ctrlKey)&&e.key==="s"){ e.preventDefault(); save(); } }})
        )
      ),
      h("div",{className:"modal-foot"},
        !isNew && mine && h("button",{className:"btn btn-ghost",style:{color:"var(--st-high,#d33)"},
          onClick:()=>{ onDelete(note); onClose(); }},"Löschen"),
        h("div",{className:"sp"}),
        h("button",{className:"btn btn-ghost",onClick:onClose},"Abbrechen"),
        h("button",{className:"btn btn-primary",disabled:saving||!title.trim(),onClick:save},
          saving?"Speichern…":"Speichern")
      )
    )
  );
}

/* ── Bugs-Popup: minimalistische Checkliste ──────────────────────────────
   Eine einzige Notiz "Bugs" als Markdown-Checkliste. Eintrag tippen, Enter,
   fertig. Jede Änderung speichert sofort (still, ohne Toast).            */
function BugChecklistModal({note, onSave, onClose}){
  const [text,setText] = useState("");
  const lines = (note && note.content ? note.content : "").split("\n").filter(l=>l.trim()!=="");

  function commit(nextLines){
    onSave({...(note || {kind:"note", title:"Bugs", teamId:null}), content:nextLines.join("\n")}, {silent:true});
  }
  function add(){
    const v = text.trim();
    if(!v) return;
    commit([...lines, `- [ ] ${v}`]);
    setText("");
  }
  function toggle(i){
    const next = [...lines];
    next[i] = next[i].replace(/\[( |x|X)\]/, m=>m==="[ ]" ? "[x]" : "[ ]");
    commit(next);
  }
  function remove(i){
    commit(lines.filter((_,j)=>j!==i));
  }

  return h("div",{className:"modal",onClick:e=>{ if(e.target===e.currentTarget) onClose(); }},
    h("div",{className:"bugs-card"},
      h("div",{className:"bugs-head"},
        h("span",null,"🐞 Bugs"),
        h("button",{className:"iconbtn",onClick:onClose,"aria-label":"Schließen"},h(Icon,{n:"x",size:15}))
      ),
      lines.length>0 && h("div",{className:"bugs-list"},
        lines.map((ln,i)=>{
          const m = ln.match(CHECK_RE);
          const done = m && m[1].toLowerCase()==="x";
          const label = m ? m[2] : ln;
          return h("div",{key:i,className:`bugs-item${done?" done":""}`},
            h("input",{type:"checkbox",checked:!!done,onChange:()=>toggle(i)}),
            h("span",{className:"grow"},label),
            h("button",{className:"bugs-del",onClick:()=>remove(i),"aria-label":"Löschen"},"×")
          );
        })
      ),
      h("input",{className:"bugs-input",value:text,autoFocus:true,
        placeholder:"Bug notieren … (Enter)",
        onChange:e=>setText(e.target.value),
        onKeyDown:e=>{ if(e.key==="Enter") add(); }})
    )
  );
}

/* ── Hauptansicht ─────────────────────────────────────────────────────── */
function NotesView({notes, onSave, onDelete, searchVal}){
  const [kindFilter,setKindFilter] = useState("all"); // all | note | plan
  const [editing,setEditing]       = useState(null);  // null | {} (neu) | note

  const visible = useMemo(()=>{
    let list = notes.filter(n=>n.title!=="Bugs");
    if(kindFilter!=="all") list = list.filter(n=>n.kind===kindFilter);
    if(searchVal){
      const q = searchVal.toLowerCase();
      list = list.filter(n=>(n.title+" "+n.content).toLowerCase().includes(q));
    }
    return list;
  },[notes,kindFilter,searchVal]);

  return h(Fragment,null,
    h("div",{className:"notes-bar"},
      h("div",{className:"seg"},
        [["all","Alle"],["note","📝 Notizen"],["plan","📅 Planungen"]].map(([k,lbl])=>
          h("button",{key:k,className:kindFilter===k?"on":"",onClick:()=>setKindFilter(k)},lbl))
      ),
      h("div",{className:"sp"}),
      h("button",{className:"btn btn-primary",onClick:()=>setEditing({})},
        h(Icon,{n:"plus",size:16})," Neue Notiz")
    ),

    visible.length===0
      ? h("div",{className:"notes-empty"},
          h("div",{style:{fontSize:40}},"🗒️"),
          h("p",null,"Noch keine Notizen hier."),
          h("button",{className:"btn btn-outline",onClick:()=>setEditing({})},"Erste Notiz anlegen")
        )
      : h("div",{className:"notes-grid"},
          visible.map(n=>h(NoteCard,{key:n.id,note:n,onOpen:setEditing,onPatch:onSave}))
        ),

    editing && h(NoteEditor,{note:editing,onClose:()=>setEditing(null),onSave,onDelete})
  );
}

Object.assign(window,{NotesView, NoteEditor, BugChecklistModal});
})();
