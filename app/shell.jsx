// ========================================================================
//  ToDo-Schule — Sidebar + Topbar
// ========================================================================
(function(){
const {useState,useRef,useEffect,useCallback} = React;
const {createElement:h,Fragment} = React;
const {USERS, ME, TEAMS, TASKS, NOTIFICATIONS} = window.ESG_DATA;

const COLOR_SWATCHES = ["#6178FE","#E8416F","#22C55E","#F59E0B","#06B6D4","#A855F7","#EF4444","#64748B","#0EA5E9","#10B981","#F97316","#8B5CF6"];
const ICON_OPTIONS   = ["📁","📚","🎓","🖥️","🔬","🎨","⚙️","📋","🏫","🎵","📐","🌍","💡","🧪","📊","🗂️","🎯","🔧"];

/* ── Team action popup ───────────────────────────────────────────────── */
function TeamPopup({team, onClose, onRename, onDelete, onUpdate, onNewTask, onInvite}){
  const [mode, setMode]       = useState("main"); // main | edit | invite
  const [editName, setEditName] = useState(team.name);
  const [editColor, setEditColor] = useState(team.color||"#6178FE");
  const [editIcon, setEditIcon]  = useState(team.icon||"📁");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const ref = useRef();

  useEffect(()=>{
    function hd(e){
      if(ref.current && !ref.current.contains(e.target)) onClose();
    }
    setTimeout(()=>document.addEventListener("mousedown",hd),0);
    return ()=>document.removeEventListener("mousedown",hd);
  },[]);

  function saveEdit(){
    const patch = {};
    if(editName.trim() && editName.trim()!==team.name) patch.name = editName.trim();
    if(editColor!==team.color) patch.color = editColor;
    if(editIcon!==team.icon)   patch.icon  = editIcon;
    if(Object.keys(patch).length) onUpdate(team.id, patch);
    onClose();
  }

  async function doInvite(){
    if(!inviteEmail.trim()) return;
    setInviting(true);
    try{
      if(window.ESG_API.hasSession()) await window.ESG_API.invite(team.id, inviteEmail.trim());
      onInvite && onInvite(team.id, inviteEmail.trim());
    }catch(e){ window._addToast()({title:"Einladung fehlgeschlagen",body:e.error||"Bitte erneut versuchen."}); }
    finally{ setInviting(false); onClose(); }
  }

  if(mode==="main") return h("div",{ref,className:"team-popup"},
    h("div",{className:"tp-header"},
      h("span",{className:"tp-icon"},team.icon),
      h("div",null,
        h("div",{className:"tp-name"},team.name),
        h("div",{className:"tp-sub"},`${TASKS.filter(t=>t.teamId===team.id&&t.status!=="done").length} offen`)
      )
    ),
    h("div",{className:"tp-sep"}),
    h("button",{className:"tp-item",onClick:()=>{onNewTask(team.id);onClose();}},
      h(Icon,{n:"plus",size:14}), "Neue Aufgabe"
    ),
    h("button",{className:"tp-item",onClick:()=>{ setMode("edit"); }},
      h(Icon,{n:"edit",size:14}), "Umbenennen"
    ),
    h("button",{className:"tp-item",onClick:()=>setMode("edit")},
      h(Icon,{n:"palette",size:14}), "Farbe & Icon"
    ),
    h("button",{className:"tp-item",onClick:()=>setMode("invite")},
      h(Icon,{n:"userPlus",size:14}), "Mitglied einladen"
    ),
    h("div",{className:"tp-sep"}),
    h("button",{className:"tp-item danger",onClick:()=>{
      onClose();
      if(window.confirm(`Bereich „${team.name}" wirklich löschen?\nAufgaben und Notizen bleiben erhalten.`)) onDelete(team.id);
    }},
      h(Icon,{n:"trash",size:14}), "Löschen"
    )
  );

  if(mode==="edit") return h("div",{ref,className:"team-popup team-popup-edit"},
    h("div",{className:"tp-edit-label"},"Name"),
    h("input",{className:"sb-rename",value:editName,autoFocus:true,
      onChange:e=>setEditName(e.target.value),
      onKeyDown:e=>{ if(e.key==="Enter") saveEdit(); if(e.key==="Escape") onClose(); }
    }),
    h("div",{className:"tp-edit-label",style:{marginTop:10}},"Farbe"),
    h("div",{className:"sb-swatches",style:{flexWrap:"wrap",gap:6}},
      COLOR_SWATCHES.map(c=>h("button",{key:c,className:`sb-swatch ${editColor===c?"on":""}`,
        style:{background:c,width:22,height:22},onClick:()=>setEditColor(c)}))
    ),
    h("div",{className:"tp-edit-label",style:{marginTop:10}},"Icon"),
    h("div",{className:"sb-icons",style:{flexWrap:"wrap"}},
      ICON_OPTIONS.map(ic=>h("button",{key:ic,className:`sb-icoopt ${editIcon===ic?"on":""}`,
        onClick:()=>setEditIcon(ic)},ic))
    ),
    h("div",{className:"row gap-8",style:{marginTop:10}},
      h("button",{className:"btn btn-primary btn-sm",style:{flex:1},onClick:saveEdit},"Speichern"),
      h("button",{className:"btn btn-ghost btn-sm",onClick:()=>setMode("main")},"Zurück")
    )
  );

  if(mode==="invite") return h("div",{ref,className:"team-popup"},
    h("div",{className:"tp-header"},
      h(Icon,{n:"userPlus",size:15,style:{color:"var(--accent)"}}),
      h("div",{className:"tp-name"},`Zu „${team.name}" einladen`)
    ),
    h("div",{style:{padding:"6px 0 4px"}},
      h("input",{className:"input btn-sm",placeholder:"E-Mail-Adresse…",value:inviteEmail,autoFocus:true,
        onChange:e=>setInviteEmail(e.target.value),
        onKeyDown:e=>{ if(e.key==="Enter") doInvite(); if(e.key==="Escape") onClose(); }
      })
    ),
    h("div",{className:"row gap-8",style:{marginTop:8}},
      h("button",{className:"btn btn-primary btn-sm",style:{flex:1},onClick:doInvite,disabled:inviting||!inviteEmail.trim()},
        inviting?"Senden…":"Einladen"
      ),
      h("button",{className:"btn btn-ghost btn-sm",onClick:()=>setMode("main")},"Zurück")
    )
  );

  return null;
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */
function Sidebar({
  activeTeam, setActiveTeam, section, setSection, open, onClose,
  onNewTask, onRenameTeam, onDeleteTeam, onCreateTeam,
  onUpdateTeam, onReorderTeams, onNewTaskInTeam,
  width, collapsed, onWidthChange, onToggleCollapse
}){
  const [profileOpen, setProfileOpen] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [tmpName, setTmpName]   = useState("");
  const [creating, setCreating] = useState(false);
  const [newColor, setNewColor] = useState("#6178FE");
  const [newIcon, setNewIcon]   = useState("📁");
  const [openMenu, setOpenMenu] = useState(null); // teamId or null

  // Drag & drop
  const dragSrc  = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Open profile modal when topbar avatar is clicked (CustomEvent bridge)
  useEffect(()=>{
    function onOpenProfile(){ setProfileOpen(true); }
    window.addEventListener("esg:openProfile", onOpenProfile);
    return ()=>window.removeEventListener("esg:openProfile", onOpenProfile);
  },[]);

  // Close popup on Escape
  useEffect(()=>{
    if(!openMenu) return;
    function hk(e){ if(e.key==="Escape") setOpenMenu(null); }
    window.addEventListener("keydown",hk);
    return ()=>window.removeEventListener("keydown",hk);
  },[openMenu]);

  function startRename(team){
    setOpenMenu(null);
    setRenaming(team.id);
    setTmpName(team.name);
  }
  function commitRename(){
    if(renaming!=null && tmpName.trim()) onRenameTeam(renaming, tmpName);
    setRenaming(null);
  }
  function commitCreate(){
    if(tmpName.trim()) onCreateTeam(tmpName, newColor, newIcon);
    setCreating(false);
    setTmpName("");
    setNewColor("#6178FE");
    setNewIcon("📁");
  }

  // DnD handlers — only for TEAMS rows
  function handleDragStart(e, teamId){
    dragSrc.current = teamId;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("dragging");
  }
  function handleDragEnd(e){
    e.currentTarget.classList.remove("dragging");
    setDragOver(null);
  }
  function handleDragOver(e, teamId){
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if(dragSrc.current && teamId !== dragSrc.current) setDragOver(teamId);
  }
  function handleDragLeave(){
    setDragOver(null);
  }
  function handleDrop(e, targetId){
    e.preventDefault();
    const srcId = dragSrc.current;
    dragSrc.current = null;
    setDragOver(null);
    if(srcId && srcId!==targetId) onReorderTeams(srcId, targetId);
  }

  // Resize drag logic
  const widthRef = useRef(width || 264);
  useEffect(()=>{ widthRef.current = width || 264; }, [width]);
  const [resizerActive, setResizerActive] = useState(false);

  function onResizerMouseDown(e){
    if(!onWidthChange) return;
    const startX = e.clientX;
    const startW = widthRef.current;
    e.preventDefault();
    setResizerActive(true);

    function onMove(ev){
      const w = Math.max(180, Math.min(420, startW + (ev.clientX - startX)));
      onWidthChange(w);
    }
    function onUp(){
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.documentElement.style.cursor = "";
      document.documentElement.style.userSelect = "";
      setResizerActive(false);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.documentElement.style.cursor = "col-resize";
    document.documentElement.style.userSelect = "none";
  }

  const navItems = [
    {id:"all",   icon:"inbox",    label:"Alle Aufgaben",   count: TASKS.filter(t=>t.status!=="done").length},
    {id:"mine",  icon:"user",     label:"Mir zugewiesen",  count: TASKS.filter(t=>t.assignees.includes(ME.id)&&t.status!=="done").length},
    {id:"today", icon:"star",     label:"Heute fällig",    count: TASKS.filter(t=>t.due===new Date().toISOString().slice(0,10)&&t.status!=="done").length},
    {id:"done",  icon:"checkCircle",label:"Erledigt",      count: TASKS.filter(t=>t.status==="done").length},
  ];

  const sbW = collapsed ? 52 : (width || 264);

  return h("aside",{className:`sidebar ${open?"open":""}`, id:"sidebar", style:{width:sbW}},
    // Resizer handle (only when not collapsed)
    !collapsed && h("div",{
      className:`sb-resizer${resizerActive?" active":""}`,
      onMouseDown:onResizerMouseDown,
      title:"Breite anpassen",
    }),

    // Profile modal
    profileOpen && h(ProfileModal,{onClose:()=>setProfileOpen(false)}),

    // Rail (collapsed state)
    collapsed ? h("div",{className:"sb-rail"},
      h("div",{className:"sb-rail-logo"},
        h("div",{className:"brand-tile",style:{width:34,height:34,borderRadius:10,border:"1px solid var(--border)"}},
          h("img",{src:"assets/esg-mark.svg",alt:"ESG"})
        )
      ),
      navItems.map(it=>h("button",{
        key:it.id,
        className:`iconbtn ${section==="tasks"&&activeTeam===it.id?"btn-soft":""}`,
        title:it.label,
        onClick:()=>{ setActiveTeam(it.id); onClose(); }
      }, h(Icon,{n:it.icon,size:18}))),
      h("div",{style:{flex:1}}),
      h("button",{className:"iconbtn",onClick:onToggleCollapse,title:"Sidebar einblenden"},
        h(Icon,{n:"chevronRight",size:16})
      )
    ) :

    h("div",{className:"sb-inner"},
    h("div",{className:"sb-brand"},
      h("div",{className:"brand-tile",style:{border:"1px solid var(--border)"}},
        h("img",{src:"assets/esg-mark.svg",alt:"ESG Logo"})
      ),
      h("div",null,
        h("div",{className:"brand-name"},"ToDo-Schule"),
        h("div",{className:"brand-sub"},"ESG Bonn")
      ),
      open
        ? h("button",{className:"iconbtn",onClick:onClose,style:{marginLeft:"auto"}},
            h(Icon,{n:"x",size:17})
          )
        : h("button",{className:"iconbtn",onClick:onToggleCollapse,style:{marginLeft:"auto"},title:"Sidebar ausblenden"},
            h(Icon,{n:"chevronLeft",size:16})
          )
    ),

    h("div",{className:"sb-new"},
      h("button",{className:"btn btn-primary btn-block",onClick:onNewTask},
        h(Icon,{n:"plus",size:17}), "Neue Aufgabe"
      )
    ),

    h("div",{className:"sb-scroll"},
      // Nav
      navItems.map(it => h("button",{
        key:it.id, className:`navitem ${section==="tasks"&&activeTeam===it.id?"on":""}`,
        onClick:()=>{ setActiveTeam(it.id); onClose(); }
      },
        h(Icon,{n:it.icon,size:17}),
        h("span",{className:"grow"},it.label),
        it.count > 0 && h("span",{className:"ct"},it.count)
      )),

      h("div",{className:"sb-label"},h("span",null,"Kollegium")),
      h("button",{
        className:`navitem ${section==="notes"?"on":""}`,
        onClick:()=>{ setSection("notes"); onClose(); }
      },
        h(Icon,{n:"book",size:17}),
        h("span",{className:"grow"},"Notizen & Planungen")
      ),

      h("button",{
        className:`navitem ${section==="chat"?"on":""}`,
        onClick:()=>{ setSection("chat"); onClose(); }
      },
        h(Icon,{n:"messageCircle",size:17}),
        h("span",{className:"grow"},"Chat")
      ),

      /* Bereiche header */
      h("div",{className:"sb-label"},
        h("span",null,"Bereiche"),
        h("button",{title:"Bereich erstellen",onClick:()=>{ setCreating(true); setTmpName(""); setOpenMenu(null); }},
          h(Icon,{n:"plus",size:13}))
      ),

      /* Team rows with DnD + three-dot menu */
      TEAMS.filter(t=>t.id!==0).map(team => {
        const cnt = TASKS.filter(t=>t.teamId===team.id&&t.status!=="done").length;
        const isOver   = dragOver===team.id;
        const isActive = section==="tasks" && activeTeam===team.id;

        if(renaming===team.id){
          return h("div",{key:team.id,className:"navitem on",style:{cursor:"default"}},
            h(TagDot,{color:team.color,size:10}),
            h("input",{className:"sb-rename",value:tmpName,autoFocus:true,
              onChange:e=>setTmpName(e.target.value),
              onBlur:commitRename,
              onKeyDown:e=>{ if(e.key==="Enter") commitRename(); if(e.key==="Escape") setRenaming(null); }
            })
          );
        }

        return h("div",{
          key:team.id,
          className:`team-row ${isActive?"active":""} ${isOver?"drag-over":""}`,
          draggable:true,
          onDragStart:e=>handleDragStart(e,team.id),
          onDragEnd:handleDragEnd,
          onDragOver:e=>handleDragOver(e,team.id),
          onDragLeave:handleDragLeave,
          onDrop:e=>handleDrop(e,team.id),
        },
          /* grip handle */
          h("span",{className:"team-grip","aria-hidden":"true"},
            h(Icon,{n:"grip",size:13,strokeWidth:2})
          ),
          /* main clickable area */
          h("div",{className:"team-row-body",onClick:()=>{ setActiveTeam(team.id); setOpenMenu(null); onClose(); }},
            h("span",{className:"team-row-icon"},team.icon),
            h("span",{className:"team-row-name"},team.name),
            cnt > 0 && h("span",{className:"ct"},cnt)
          ),
          /* three-dot button */
          h("button",{
            className:"team-more",
            title:"Optionen",
            onClick:e=>{ e.stopPropagation(); setOpenMenu(openMenu===team.id?null:team.id); }
          }, h(Icon,{n:"moreV",size:14})),

          /* popup menu */
          openMenu===team.id && h(TeamPopup,{
            team,
            onClose:()=>setOpenMenu(null),
            onRename:startRename,
            onDelete:onDeleteTeam,
            onUpdate:onUpdateTeam,
            onNewTask:onNewTaskInTeam,
            onInvite:()=>{}
          })
        );
      }),

      /* Create new Bereich */
      creating && h("div",{className:"team-creator"},
        h("div",{className:"row gap-8",style:{marginBottom:7}},
          h("span",{className:"sb-icon-pick"},newIcon),
          h("input",{className:"sb-rename",value:tmpName,autoFocus:true,placeholder:"Name des Bereichs…",
            onChange:e=>setTmpName(e.target.value),
            onKeyDown:e=>{
              if(e.key==="Enter") commitCreate();
              if(e.key==="Escape"){ setCreating(false); setTmpName(""); }
            }})
        ),
        h("div",{className:"tp-edit-label"},"Farbe"),
        h("div",{className:"sb-swatches",style:{flexWrap:"wrap",gap:6}},
          COLOR_SWATCHES.map(c=>h("button",{key:c,className:`sb-swatch ${newColor===c?"on":""}`,
            style:{background:c,width:22,height:22},onClick:()=>setNewColor(c)}))
        ),
        h("div",{className:"tp-edit-label",style:{marginTop:8}},"Icon"),
        h("div",{className:"sb-icons",style:{flexWrap:"wrap"}},
          ICON_OPTIONS.map(ic=>h("button",{key:ic,className:`sb-icoopt ${newIcon===ic?"on":""}`,
            onClick:()=>setNewIcon(ic)},ic))
        ),
        h("div",{className:"row gap-8",style:{marginTop:9}},
          h("button",{className:"btn btn-primary btn-sm",style:{flex:1},onClick:commitCreate},"Erstellen"),
          h("button",{className:"btn btn-ghost btn-sm",onClick:()=>{ setCreating(false); setTmpName(""); }},"Abbrechen")
        )
      ),

      h("div",{className:"sb-label"},"Kollegium"),
      h("div",{style:{padding:"4px 6px",display:"flex",flexDirection:"column",gap:4}},
        USERS.map(u =>
          h("div",{key:u.id,className:"row gap-8",style:{padding:"3px 4px"}},
            h(Avatar,{userId:u.id,size:"xs",showPresence:true}),
            h("div",null,
              h("div",{style:{fontSize:13,fontWeight:550,lineHeight:1.1}},
                u.name, u.id===ME.id && h("span",{style:{fontSize:11,color:"var(--accent)",marginLeft:5,fontWeight:700}},"(ich)")
              ),
              h("div",{style:{fontSize:11,color:"var(--text-3)",display:"flex",alignItems:"center",gap:4}},
                h(PresenceDot,{status:u.presence||"online"}),
                (u.presence||"online")==="online"?"Online":"Abwesend"
              )
            )
          )
        )
      )
    ),

    h("div",{className:"sb-foot"},
      h("button",{className:"userchip",onClick:()=>setProfileOpen(true)},
        h(Avatar,{userId:ME.id,size:"sm",showPresence:true}),
        h("div",null,
          h("div",{className:"nm"},ME.name),
          h("div",{className:"rl"},ME.role)
        ),
        h("span",{className:"cog"},h(Icon,{n:"settings",size:15}))
      )
    )
    ) // sb-inner
  );
}

/* ── Topbar ──────────────────────────────────────────────────────────── */
function Topbar({activeTeam, section, view, setView, notifCount, onBell, onMenuOpen, searchVal, setSearchVal, presenceUsers, theme, onToggleTheme, onQuickNote}){
  const isChat  = section === "chat";
  // Chat & Notes both hide the task view-toggle and use their own title
  const isNotes = section === "notes" || isChat;
  const team = !isNotes && typeof activeTeam === "number"
    ? TEAMS.find(t=>t.id===activeTeam)
    : null;

  const crumb = isChat
    ? "Chat"
    : section === "notes"
    ? "Notizen & Planungen"
    : team ? [team.name] : {all:"Alle Aufgaben",mine:"Mir zugewiesen",today:"Heute fällig",done:"Erledigt"}[activeTeam];

  return h("header",{className:"topbar"},
    h("button",{className:"iconbtn menu-btn",onClick:onMenuOpen,"aria-label":"Menü"},
      h(Icon,{n:"menu",size:20})
    ),
    h("div",{className:"page-h"},
      team && h("div",{className:"crumb"},
        h(TagDot,{color:team.color,size:8}), team.name
      ),
      h("h1",null,
        typeof crumb === "string" ? crumb : (team ? team.name : "Alle Aufgaben")
      )
    ),

    h("div",{className:"sp"}),

    presenceUsers.length > 0 && h("div",{className:"presence"},
      h("span",{className:"live-dot"}),
      h(AvatarStack,{userIds:presenceUsers.slice(0,4),size:"xs"}),
      h("span",{className:"lbl"},`${presenceUsers.length} aktiv`)
    ),

    h("div",{className:"topbar-tools"},
      h("button",{className:"btn btn-news",onClick:onQuickNote,title:"Bugs notieren"},
        h(Icon,{n:"alertCircle",size:15}), "Bugs"
      ),
      h("div",{className:"search"},
        h(Icon,{n:"search",size:16}),
        h("input",{placeholder:"Suchen…",value:searchVal,onChange:e=>setSearchVal(e.target.value),"aria-label":"Suchen"}),
        !searchVal && h("kbd",null,"⌘K")
      ),

      !isNotes && h("div",{className:"seg"},
        h("button",{className:view==="list"?"on":"",onClick:()=>setView("list"),title:"Listenansicht"},
          h(Icon,{n:"list",size:15}), "Liste"
        ),
        h("button",{className:view==="board"?"on":"",onClick:()=>setView("board"),title:"Board"},
          h(Icon,{n:"layout",size:15}), "Board"
        ),
        h("button",{className:view==="calendar"?"on":"",onClick:()=>setView("calendar"),title:"Kalender"},
          h(Icon,{n:"calendar",size:15}), "Kalender"
        ),
        h("button",{className:view==="kiosk"?"on":"",onClick:()=>setView("kiosk"),title:"Vollbild-Ansicht"},
          h(Icon,{n:"monitor",size:15}), "Vollbild"
        )
      ),

      h("button",{className:"iconbtn",onClick:onToggleTheme,"aria-label":"Theme wechseln",
        title:theme==="dark"?"Heller Modus":"Dunkler Modus"},
        h(Icon,{n:theme==="dark"?"sun":"moon",size:18})
      ),

      h("div",{style:{position:"relative"}},
        h("button",{className:"iconbtn",onClick:onBell,"aria-label":"Benachrichtigungen",title:"Benachrichtigungen"},
          h(Icon,{n:"bell",size:19}),
          notifCount > 0 && h("span",{className:"dot"})
        )
      ),

      h(Avatar,{userId:ME.id,size:"sm",showPresence:true,style:{cursor:"pointer"},
        onClick:()=>window.dispatchEvent(new CustomEvent("esg:openProfile"))})
    )
  );
}

/* ── Profile Modal ───────────────────────────────────────────────────── */
function ProfileModal({onClose}){
  const [name, setName]     = useState(ME.name);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState(null);
  const avatarRef = useRef();
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(ME.avatarUrl || null);
  const hasAPI = window.ESG_API.hasSession();

  async function onAvatarChange(e){
    const file = e.target.files[0] || null;
    setAvatarFile(file);
    if(!file){ setPreviewUrl(ME.avatarUrl||null); return; }
    const lname = file.name.toLowerCase();
    if((lname.endsWith(".heic")||lname.endsWith(".heif")) && window.heic2any){
      const blob = await window.heic2any({blob:file,toType:"image/jpeg",quality:0.8});
      setPreviewUrl(URL.createObjectURL(blob));
    } else if(!lname.endsWith(".heic") && !lname.endsWith(".heif")){
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function save(e){
    e.preventDefault();
    setBusy(true); setMsg(null);
    try{
      const patch = {};
      if(name.trim() && name.trim()!==ME.name) patch.name = name.trim();
      if(newPass.length>=8){
        if(!oldPass){ setMsg("Aktuelles Passwort eingeben."); setBusy(false); return; }
        patch.password = newPass;
        patch.currentPassword = oldPass;
      }
      if(avatarFile){
        const lname = avatarFile.name.toLowerCase();
        let fileToSend = avatarFile;
        if((lname.endsWith(".heic")||lname.endsWith(".heif")) && window.heic2any){
          const blob = await window.heic2any({blob:avatarFile,toType:"image/jpeg",quality:0.9});
          fileToSend = new File([blob], avatarFile.name.replace(/\.heic$/i,".jpg"), {type:"image/jpeg"});
        }
        const result = await window.ESG_API.uploadAvatar(fileToSend);
        ME.avatarUrl = result.avatarUrl;
      }
      if(!Object.keys(patch).length && !avatarFile){ setMsg("Keine Änderungen."); setBusy(false); return; }
      if(Object.keys(patch).length && hasAPI) await window.ESG_API.updateMe(patch);
      if(patch.name){ ME.name=patch.name; ME.initials=patch.name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
      window._addToast()({title:"Profil gespeichert",body:"Änderungen wurden übernommen.",icon:"checkCircle",color:"var(--st-done-bg)",iconColor:"var(--st-done)"});
      onClose();
    }catch(err){ setMsg(err.error||"Fehler beim Speichern."); }
    finally{ setBusy(false); }
  }

  return h(Fragment,null,
    h("div",{className:"scrim",onClick:onClose}),
    h("div",{className:"modal"},
      h("div",{className:"modal-card"},
        h("div",{className:"modal-head"},
          h("div",{style:{width:42,height:42,borderRadius:13,background:"var(--accent-soft)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)"}},
            h(Icon,{n:"person",size:20})
          ),
          h("div",null,
            h("h3",null,"Profil & Einstellungen"),
            h("p",{style:{fontSize:13,color:"var(--text-2)",margin:"2px 0 0"}},ME.email||ME.role)
          ),
          h("div",{className:"sp"}),
          h("button",{className:"iconbtn btn-sm",onClick:onClose},h(Icon,{n:"x",size:16}))
        ),
        h("form",{onSubmit:save},
          h("div",{className:"modal-body"},
            h("div",{className:"field"},
              h("label",null,"Name"),
              h("input",{className:"input input-lg",value:name,onChange:e=>setName(e.target.value),autoFocus:true})
            ),
            hasAPI && h(Fragment,null,
              h("div",{className:"field"},
                h("label",null,"Aktuelles Passwort (nur bei Passwortwechsel)"),
                h("input",{className:"input input-lg",type:"password",value:oldPass,onChange:e=>setOldPass(e.target.value),placeholder:"Leer lassen wenn kein Wechsel"})
              ),
              h("div",{className:"field"},
                h("label",null,"Neues Passwort"),
                h("input",{className:"input input-lg",type:"password",value:newPass,onChange:e=>setNewPass(e.target.value),placeholder:"Mindestens 8 Zeichen"})
              ),
              h("div",{className:"field"},
                h("label",null,"Profilfoto"),
                h("div",{style:{display:"flex",alignItems:"center",gap:12,marginTop:4}},
                  previewUrl && h("img",{src:previewUrl,alt:"Vorschau",style:{width:56,height:56,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--border)",flexShrink:0}}),
                  h("div",null,
                    h("input",{ref:avatarRef,type:"file",accept:"image/*, .heic, .heif",style:{display:"none"},onChange:onAvatarChange}),
                    h("button",{type:"button",className:"btn btn-ghost btn-sm",onClick:()=>avatarRef.current?.click()},
                      h(Icon,{n:"upload",size:14}),"Foto auswählen"
                    ),
                    avatarFile && h("p",{style:{fontSize:11,color:"var(--text-2)",marginTop:4}},avatarFile.name)
                  )
                )
              )
            ),
            msg && h("div",{style:{color:"var(--st-high,#c0392b)",fontSize:13,fontWeight:600,marginTop:8}},msg)
          ),
          h("div",{className:"modal-foot"},
            h("div",{className:"sp"}),
            h("button",{type:"button",className:"btn btn-outline",onClick:onClose},"Abbrechen"),
            h("button",{type:"submit",className:"btn btn-primary",disabled:busy},busy?"Speichern…":"Profil speichern")
          )
        )
      )
    )
  );
}

Object.assign(window,{Sidebar, Topbar});
})();
