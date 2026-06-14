// dist/admin.js — ToDo-Schule · Administrationsbereich
// Benutzerverwaltung: anlegen, bearbeiten, Passwort zurücksetzen, löschen.
// Sichtbar nur für Nutzer mit is_admin=1.
(function(){
"use strict";
const{useState:S,useEffect:v,useRef:T}=React,h=React.createElement;

function relDate(iso){
  if(!iso)return"–";
  const d=new Date(iso),diff=Date.now()-d.getTime();
  if(diff<60000)return"gerade";
  if(diff<3600000)return Math.floor(diff/60000)+" Min.";
  if(diff<86400000)return Math.floor(diff/3600000)+" Std.";
  return d.toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"2-digit"});
}

// ── Passwort-Dialog ─────────────────────────────────────────────────────────
function PwDialog({title,onClose,onCopy,pw}){
  const ref=T(null);
  v(()=>{ref.current&&ref.current.focus();},[]);
  return h("div",{className:"adm-dialog-scrim",onClick:onClose},
    h("div",{className:"adm-dialog",onClick:e=>e.stopPropagation()},
      h("div",{className:"adm-dialog-head"},
        h("strong",null,title),
        h("button",{className:"iconbtn",onClick:onClose},h(Icon,{n:"x",size:16}))
      ),
      h("div",{className:"adm-dialog-body"},
        h("p",{className:"adm-pw-hint"},"Dieses Passwort einmalig kopieren — es wird nicht erneut angezeigt."),
        h("div",{className:"adm-pw-row"},
          h("code",{className:"adm-pw-code"},pw),
          h("button",{ref,className:"btn btn-sm btn-primary",onClick:()=>{
            navigator.clipboard&&navigator.clipboard.writeText(pw).then(()=>{
              window._addToast&&window._addToast()({title:"Kopiert!",body:"Passwort in Zwischenablage."});
              onCopy&&onCopy();
            });
          }},h(Icon,{n:"copy",size:14}),"Kopieren")
        )
      )
    )
  );
}

// ── Nutzer-Formular (anlegen / bearbeiten) ───────────────────────────────────
function UserForm({initial,onSave,onClose}){
  const isNew=!initial;
  const[name,setName]=S(initial?.name||"");
  const[email,setEmail]=S(initial?.email||"");
  const[abbr,setAbbr]=S(initial?.abbreviation||"");
  const[pw,setPw]=S("");
  const[isAdmin,setAdmin]=S(!!initial?.is_admin);
  const[err,setErr]=S("");
  const[busy,setBusy]=S(false);

  async function submit(e){
    e.preventDefault();
    if(!name.trim()||!email.trim()){setErr("Name und E-Mail sind Pflicht.");return;}
    if(isNew&&pw&&pw.length<8){setErr("Passwort min. 8 Zeichen.");return;}
    setBusy(true);setErr("");
    try{
      const body={name:name.trim(),email:email.trim(),abbreviation:abbr.trim()||null,isAdmin};
      if(isNew&&pw)body.password=pw;
      const url=isNew?"/api/admin/users":"/api/admin/users/"+initial.id;
      const method=isNew?"POST":"PATCH";
      const res=await window.ESG_API.fetch(url,{method,body:JSON.stringify(body)});
      onSave(res.user,res.tempPassword||null);
    }catch(e){setErr(e.error||e.message||"Fehler");}
    setBusy(false);
  }

  return h("div",{className:"adm-dialog-scrim",onClick:onClose},
    h("form",{className:"adm-dialog adm-dialog--form",onSubmit:submit,onClick:e=>e.stopPropagation()},
      h("div",{className:"adm-dialog-head"},
        h("strong",null,isNew?"Neue Lehrkraft":"Profil bearbeiten"),
        h("button",{type:"button",className:"iconbtn",onClick:onClose},h(Icon,{n:"x",size:16}))
      ),
      h("div",{className:"adm-dialog-body"},
        h("div",{className:"field"},
          h("label",null,"Name *"),
          h("input",{className:"input",value:name,onChange:e=>setName(e.target.value),autoFocus:true,required:true})
        ),
        h("div",{className:"field"},
          h("label",null,"E-Mail *"),
          h("input",{className:"input",type:"email",value:email,onChange:e=>setEmail(e.target.value),required:true})
        ),
        h("div",{className:"field"},
          h("label",null,"Kürzel (z. B. ca)"),
          h("input",{className:"input",value:abbr,onChange:e=>setAbbr(e.target.value),maxLength:10})
        ),
        isNew&&h("div",{className:"field"},
          h("label",null,"Passwort (leer = automatisch generiert)"),
          h("input",{className:"input",type:"password",value:pw,onChange:e=>setPw(e.target.value),placeholder:"Min. 8 Zeichen oder leer lassen"})
        ),
        h("label",{className:"adm-checkbox"},
          h("input",{type:"checkbox",checked:isAdmin,onChange:e=>setAdmin(e.target.checked)}),
          "Administrator"
        ),
        err&&h("p",{className:"adm-err"},err)
      ),
      h("div",{className:"adm-dialog-foot"},
        h("button",{type:"button",className:"btn btn-outline",onClick:onClose},"Abbrechen"),
        h("button",{type:"submit",className:"btn btn-primary",disabled:busy},
          busy?"Speichern…":(isNew?"Anlegen":"Speichern"))
      )
    )
  );
}

// ── Hauptansicht ─────────────────────────────────────────────────────────────
function AdminView(){
  const{ME}=window.ESG_DATA||{};
  const[users,setUsers]=S([]);
  const[loading,setLoading]=S(true);
  const[q,setQ]=S("");
  const[modal,setModal]=S(null); // null | {type:"create"|"edit",user?} | {type:"pw",pw,title}
  const[busy,setBusy]=S({});

  async function load(){
    setLoading(true);
    try{const r=await window.ESG_API.fetch("/api/admin/users");setUsers(r.users||[]);}
    catch(e){}
    setLoading(false);
  }
  v(()=>{load();},[]);

  function setUserBusy(id,val){setBusy(b=>({...b,[id]:val}));}

  async function resetPw(u){
    setUserBusy(u.id,true);
    try{
      const r=await window.ESG_API.fetch("/api/admin/users/"+u.id+"/reset",{method:"POST",body:"{}"});
      setModal({type:"pw",title:"Passwort von "+u.name,pw:r.tempPassword});
      await load();
    }catch(e){window._addToast&&window._addToast()({title:"Fehler",body:e.error||"Reset fehlgeschlagen"});}
    setUserBusy(u.id,false);
  }

  async function deleteUser(u){
    if(!window.confirm(`Nutzer „${u.name}" wirklich löschen? Alle Daten werden entfernt.`))return;
    setUserBusy(u.id,true);
    try{
      await window.ESG_API.fetch("/api/admin/users/"+u.id,{method:"DELETE"});
      await load();
    }catch(e){window._addToast&&window._addToast()({title:"Fehler",body:e.error||"Löschen fehlgeschlagen"});}
    setUserBusy(u.id,false);
  }

  function onSaved(user,tempPw){
    setModal(null);
    load();
    if(tempPw)setModal({type:"pw",title:"Passwort für "+user.name,pw:tempPw});
  }

  const filtered=users.filter(u=>!q||(u.name||"").toLowerCase().includes(q.toLowerCase())||(u.email||"").toLowerCase().includes(q.toLowerCase()));

  return h("div",{className:"adm-view"},
    h("div",{className:"adm-header"},
      h("div",{className:"adm-header-top"},
        h("h2",{className:"adm-title"},h(Icon,{n:"users",size:18}),"Benutzerverwaltung"),
        h("button",{className:"btn btn-primary btn-sm",onClick:()=>setModal({type:"create"})},
          h(Icon,{n:"plus",size:14}),"Lehrkraft anlegen")
      ),
      h("div",{className:"adm-search"},
        h(Icon,{n:"search",size:15}),
        h("input",{className:"adm-search-input",placeholder:"Name oder E-Mail suchen…",
          value:q,onChange:e=>setQ(e.target.value)})
      )
    ),

    loading&&h("div",{className:"adm-loading"},h(Icon,{n:"activity",size:22,className:"spin"}),"Wird geladen…"),

    !loading&&h("div",{className:"adm-table-wrap"},
      h("table",{className:"adm-table"},
        h("thead",null,h("tr",null,
          h("th",null,"Name"),
          h("th",null,"E-Mail"),
          h("th",null,"Kürzel"),
          h("th",null,"Rolle"),
          h("th",null,"Zuletzt aktiv"),
          h("th",null,"Aktionen")
        )),
        h("tbody",null,
          filtered.length===0&&h("tr",null,h("td",{colSpan:6,className:"adm-empty"},"Keine Nutzer gefunden.")),
          filtered.map(u=>h("tr",{key:u.id,className:u.id===ME?.id?"adm-row--self":""},
            h("td",null,
              h("div",{className:"adm-user-cell"},
                h(Avatar,{userId:u.id,size:"sm"}),
                h("span",null,u.name)
              )
            ),
            h("td",{className:"adm-email"},u.email),
            h("td",null,h("code",{className:"adm-abbr"},u.abbreviation||"–")),
            h("td",null,u.is_admin
              ? h("span",{className:"adm-badge adm-badge--admin"},h(Icon,{n:"shield",size:11}),"Admin")
              : h("span",{className:"adm-badge"},"Lehrkraft")
            ),
            h("td",{className:"adm-lastseen"},relDate(u.last_seen_at)),
            h("td",null,h("div",{className:"adm-actions"},
              h("button",{className:"iconbtn",title:"Bearbeiten",
                onClick:()=>setModal({type:"edit",user:u})},h(Icon,{n:"edit2",size:15})),
              h("button",{className:"iconbtn",title:"Passwort zurücksetzen",
                disabled:!!busy[u.id],onClick:()=>resetPw(u)},h(Icon,{n:"key",size:15})),
              u.id!==ME?.id&&h("button",{className:"iconbtn adm-del",title:"Löschen",
                disabled:!!busy[u.id],onClick:()=>deleteUser(u)},h(Icon,{n:"trash2",size:15}))
            ))
          ))
        )
      )
    ),

    modal?.type==="create"&&h(UserForm,{onSave:onSaved,onClose:()=>setModal(null)}),
    modal?.type==="edit"&&h(UserForm,{initial:modal.user,onSave:onSaved,onClose:()=>setModal(null)}),
    modal?.type==="pw"&&h(PwDialog,{title:modal.title,pw:modal.pw,
      onClose:()=>setModal(null),onCopy:()=>setModal(null)})
  );
}
window.AdminView=AdminView;
})();
