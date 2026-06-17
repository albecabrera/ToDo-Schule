// ========================================================================
//  ToDo-Schule — Root App Component
// ========================================================================
(function(){
const {useState,useEffect,useMemo,useCallback,useRef} = React;
const {createElement:h,Fragment} = React;
const {TASKS:INIT_TASKS, TEAMS, NOTIFICATIONS:INIT_NOTIFS, USERS, ME} = window.ESG_DATA;
const {useTweaks,TweaksPanel,TweakSection,TweakToggle,TweakRadio,TweakSlider} = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme":"light","accent":"indigo","density":"default","defaultView":"list"
}/*EDITMODE-END*/;

/* ── Echtzeit & Push ─────────────────────────────────────────────────── */
const WS_URL = window.ESG_WS_URL || "ws://127.0.0.1:8090";

/* Service Worker registrieren (Basis für Push-Notifications). */
function registerServiceWorker(){
  if(!("serviceWorker" in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register("sw.js").catch(err=>{
    console.warn("Service Worker nicht registriert:", err);
    return null;
  });
}

/* System-Notification über den Service Worker anzeigen. */
function pushNotify(title, body, data){
  if(!("Notification" in window) || Notification.permission !== "granted") return;
  navigator.serviceWorker?.ready.then(reg=>{
    reg.showNotification(title, {
      body, data,
      icon: "assets/esg-mark.svg",
      badge: "assets/esg-mark.svg",
      tag: data && data.taskId ? `task-${data.taskId}` : undefined,
    });
  }).catch(()=>{});
}

/* ── Toast helper ────────────────────────────────────────────────────── */
let _addToast = ()=>{};
function useToasts(){
  const [list,setList] = useState([]);
  const add = useCallback((t)=>{
    const id = Date.now();
    setList(p=>[...p,{id,...t}]);
    setTimeout(()=>setList(p=>p.map(x=>x.id===id?{...x,out:true}:x)),4800);
    setTimeout(()=>setList(p=>p.filter(x=>x.id!==id)),5200);
  },[]);
  const dismiss = useCallback((id)=>{
    setList(p=>p.map(x=>x.id===id?{...x,out:true}:x));
    setTimeout(()=>setList(p=>p.filter(x=>x.id!==id)),300);
  },[]);
  useEffect(()=>{ _addToast = add; },[add]);
  return {list,add,dismiss};
}

/* ── Filter tasks by activeTeam ──────────────────────────────────────── */
function filterTasks(tasks, activeTeam){
  const today = new Date().toISOString().slice(0,10);
  if(activeTeam==="all")   return tasks;
  if(activeTeam==="mine")  return tasks.filter(t=>t.assignees.includes(ME.id));
  if(activeTeam==="today") return tasks.filter(t=>t.due===today&&t.status!=="done");
  if(activeTeam==="done")  return tasks.filter(t=>t.status==="done");
  if(typeof activeTeam==="number") return tasks.filter(t=>t.teamId===activeTeam);
  return tasks;
}

/* ── Team banner ─────────────────────────────────────────────────────── */
function TeamBanner({activeTeam, tasks}){
  const team = typeof activeTeam==="number" ? TEAMS.find(t=>t.id===activeTeam) : null;
  if(!team) return null;
  const tTasks = tasks.filter(t=>t.teamId===team.id);
  const done = tTasks.filter(t=>t.status==="done").length;
  const pct = tTasks.length ? Math.round(done/tTasks.length*100) : 0;
  const members = team.members.slice(0,5);
  return h("div",{className:"team-banner"},
    h("div",{className:"tic",style:{background:team.color+"22"}},
      h("span",{style:{fontSize:22}},team.icon)
    ),
    h("div",null,
      h("h2",null,team.name),
      h("div",{style:{display:"flex",alignItems:"center",gap:12,marginTop:5}},
        h("div",{className:"kbar",style:{width:120}},
          h("i",{style:{width:`${pct}%`,background:team.color}})
        ),
        h("span",{style:{fontSize:12.5,color:"var(--text-2)",fontWeight:600}},`${pct}% erledigt`)
      )
    ),
    h("div",{className:"sp"}),
    h("div",{className:"team-stats"},
      h("div",{className:"ts"},h("strong",null,tTasks.filter(t=>t.status!=="done").length),h("span",null,"Offen")),
      h("div",{className:"ts"},h("strong",null,done),h("span",null,"Erledigt")),
      h("div",{className:"ts"},h("strong",null,team.members.length),h("span",null,"Mitglieder"))
    ),
    h(AvatarStack,{userIds:members,size:"sm"}),
    h("button",{className:"btn btn-ghost btn-sm"},h(Icon,{n:"settings",size:15}))
  );
}

/* ── Passwortwechsel nach dem ersten Login (Erstpasswort = Nachname) ──── */
function ChangePasswordModal({onDone, onSkip}){
  const [p1,setP1] = useState("");
  const [p2,setP2] = useState("");
  const [err,setErr] = useState(null);
  const [busy,setBusy] = useState(false);

  async function submit(e){
    e.preventDefault();
    if(p1.length<8) return setErr("Mindestens 8 Zeichen.");
    if(p1!==p2)     return setErr("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    try{
      await window.ESG_API.updateMe({password:p1});
      onDone();
    }catch(ex){
      setErr(ex.error||"Passwort konnte nicht geändert werden.");
    }finally{ setBusy(false); }
  }

  return h("div",{className:"modal"},
    h("div",{className:"modal-card"},
      h("div",{className:"modal-head"},h("h3",null,"🔐 Passwort ändern")),
      h("div",{className:"modal-sub"},"Du nutzt noch dein Erstpasswort (dein Nachname). Bitte wähle jetzt ein eigenes."),
      h("form",{onSubmit:submit},
        h("div",{className:"modal-body"},
          err && h("div",{style:{color:"var(--st-high,#c0392b)",fontSize:13,fontWeight:600}},err),
          h("div",{className:"field"},
            h("label",null,"Neues Passwort"),
            h("input",{className:"input input-lg",type:"password",value:p1,autoFocus:true,
              placeholder:"Mindestens 8 Zeichen",onChange:e=>setP1(e.target.value)})
          ),
          h("div",{className:"field"},
            h("label",null,"Wiederholen"),
            h("input",{className:"input input-lg",type:"password",value:p2,
              onChange:e=>setP2(e.target.value)})
          )
        ),
        h("div",{className:"modal-foot"},
          h("button",{type:"button",className:"btn btn-ghost",onClick:onSkip},"Später"),
          h("div",{className:"sp"}),
          h("button",{type:"submit",className:"btn btn-primary",disabled:busy},
            busy?"Speichern…":"Passwort speichern")
        )
      )
    )
  );
}

/* ── Error Boundary ──────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,err:null}; }
  static getDerivedStateFromError(err){ return {hasError:true,err}; }
  componentDidCatch(err,info){ console.error("App error:", err, info); }
  render(){
    if(!this.state.hasError) return this.props.children;
    return React.createElement("div",{className:"error-boundary"},
      React.createElement(Icon,{n:"alertCircle",size:36,style:{color:"var(--coral)"}}),
      React.createElement("h2",null,"Ein Fehler ist aufgetreten"),
      React.createElement("p",null, this.state.err?.message || "Unbekannter Fehler"),
      React.createElement("button",{className:"btn btn-outline",onClick:()=>this.setState({hasError:false,err:null})},"Erneut versuchen")
    );
  }
}

/* ── Main App ────────────────────────────────────────────────────────── */
function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Theme wiederherstellen: gespeicherte Wahl > System-Präferenz
  useEffect(()=>{
    const saved = localStorage.getItem("esg-theme");
    if(saved==="dark"||saved==="light") setTweak("theme",saved);
    else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches) setTweak("theme","dark");
  },[]);
  useEffect(()=>{
    const root = document.documentElement;
    root.setAttribute("data-theme", t.theme==="dark"?"dark":"");
    root.setAttribute("data-accent", t.accent==="indigo"?"":t.accent);
    root.setAttribute("data-density", t.density==="default"?"":t.density);
    localStorage.setItem("esg-theme", t.theme);
  },[t.theme,t.accent,t.density]);
  // persist default view choice
  const [screen,setScreen] = useState(() => localStorage.getItem("accessToken") ? "app" : "login");
  useEffect(() => {
    function onExpired() { setScreen("login"); }
    window.addEventListener("esg:auth:expired", onExpired);
    return () => window.removeEventListener("esg:auth:expired", onExpired);
  }, []);
  const [section,setSection]       = useState("tasks"); // tasks | notes
  const [tasks, setTasks]          = useState(INIT_TASKS);
  const [notes, setNotes]          = useState(window.ESG_DATA.NOTES);
  const [notifs, setNotifs]        = useState(INIT_NOTIFS);
  const [activeTeam, setActiveTeam]= useState("all");
  const [view, setView]            = useState("list");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openTask, setOpenTask]    = useState(null);
  const [shareTask, setShareTask]  = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [mustChangePass, setMustChangePass] = useState(false);
  const [welcome, setWelcome] = useState(null); // {greet,name,out} — Vollbild-Begrüßung
  const [showNotifs, setShowNotifs]= useState(false);
  const [searchVal, setSearchVal]  = useState("");
  const [filters, setFilters]      = useState(()=>{ try{ const s=localStorage.getItem("task-filters"); return s?JSON.parse(s):{priority:null,status:null,overdue:null}; }catch{ return {priority:null,status:null,overdue:null}; } });
  useEffect(()=>{ localStorage.setItem("task-filters",JSON.stringify(filters)); },[filters]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [sbWidth, setSbWidth] = useState(()=>{ const s=localStorage.getItem("sb-width"); return s?Math.max(180,Math.min(420,Number(s))):264; });
  const [sbCollapsed, setSbCollapsed] = useState(()=>localStorage.getItem("sb-collapsed")==="1");
  const [sortBy, setSortBy] = useState("default");
  const [demoMode, setDemoMode] = useState(false);
  const [defaultDue, setDefaultDue] = useState(null);
  const {list:toasts,add:addToast,dismiss:dismissToast} = useToasts();

  const unread = notifs.filter(n=>!n.read).length;

  // Filtered tasks for current view
  const visibleTasks = useMemo(()=>filterTasks(tasks, activeTeam),[tasks,activeTeam]);

  // Presence users for topbar
  const presenceUsers = useMemo(()=>USERS.filter(u=>u.presence==="online"&&u.id!==ME.id).map(u=>u.id),[]);

  // Toggle task done (persistiert ans Backend, optimistisches Update)
  function toggleDone(id){
    let nextStatus;
    setTasks(prev => prev.map(t => {
      if(t.id!==id) return t;
      nextStatus = t.status==="done"?"todo":"done";
      return {...t, status: nextStatus};
    }));
    if(window.ESG_API.hasSession() && nextStatus){
      window.ESG_API.updateTask(id,{status:nextStatus}).catch(()=>{
        setTasks(prev => prev.map(t => t.id===id ? {...t, status: nextStatus==="done"?"todo":"done"} : t));
        addToast({title:"Fehler",body:"Status konnte nicht gespeichert werden."});
      });
    }
  }

  // Add new task (über API, lokal als Fallback im Demo-Modus)
  function addTask(t){
    if(window.ESG_API.hasSession()){
      window.ESG_API.createTask(t)
        .then(saved=>{
          setTasks(prev=>[saved,...prev.filter(x=>x.id!==saved.id)]);
          addToast({title:"Aufgabe erstellt",body:`<b>${saved.title}</b> wurde hinzugefügt.`,icon:"checkCircle",color:"var(--st-done-bg)",iconColor:"var(--st-done)"});
        })
        .catch(err=>addToast({title:"Fehler",body:err.error||"Aufgabe konnte nicht erstellt werden."}));
      return;
    }
    setTasks(prev=>[t,...prev]);
    addToast({title:"Aufgabe erstellt",body:`<b>${t.title}</b> wurde hinzugefügt.`,icon:"checkCircle",color:"var(--st-done-bg)",iconColor:"var(--st-done)"});
  }

  // Notiz speichern (create oder update), geteilt via teamId
  async function saveNote(n, {silent}={}){
    if(window.ESG_API.hasSession()){
      try{
        const saved = n.id
          ? await window.ESG_API.updateNote(n.id, n)
          : await window.ESG_API.createNote(n);
        setNotes(prev => n.id ? prev.map(x=>x.id===saved.id?saved:x) : [saved,...prev]);
        if(!silent) addToast({title:n.id?"Notiz gespeichert":"Notiz erstellt",body:`<b>${saved.title}</b>`,icon:"checkCircle",color:"var(--st-done-bg)",iconColor:"var(--st-done)"});
      }catch(err){
        addToast({title:"Fehler",body:err.error||"Notiz konnte nicht gespeichert werden."});
        throw err;
      }
      return;
    }
    // Demo-Modus: lokal
    if(n.id) setNotes(prev=>prev.map(x=>x.id===n.id?{...x,...n,updatedAt:new Date().toISOString()}:x));
    else setNotes(prev=>[{...n,id:Date.now(),createdBy:ME.id,authorName:ME.name,updatedAt:new Date().toISOString()},...prev]);
  }

  function deleteNote(n){
    setNotes(prev=>prev.filter(x=>x.id!==n.id));
    if(window.ESG_API.hasSession()){
      window.ESG_API.deleteNote(n.id).catch(()=>{
        setNotes(prev=>[n,...prev]);
        addToast({title:"Fehler",body:"Notiz konnte nicht gelöscht werden."});
      });
    }
  }

  // updateTask — full patch, optimistisch, mit Toast bei Fehler
  async function updateTask(patchedTask){
    const prev = tasks.find(t=>t.id===patchedTask.id);
    setTasks(ts=>ts.map(t=>t.id===patchedTask.id?{...t,...patchedTask}:t));
    if(window.ESG_API.hasSession()){
      try{
        const saved = await window.ESG_API.updateTask(patchedTask.id, patchedTask);
        setTasks(ts=>ts.map(t=>t.id===saved.id?{...t,...saved}:t));
      }catch(err){
        if(prev) setTasks(ts=>ts.map(t=>t.id===prev.id?prev:t));
        addToast({title:"Fehler",body:err.error||"Aufgabe konnte nicht gespeichert werden."});
      }
    }
    setOpenTask(null);
  }

  // moveTask — Board DnD status change
  function moveTask(id, status){
    const prev = tasks.find(t=>t.id===id);
    setTasks(ts=>ts.map(t=>t.id===id?{...t,status}:t));
    if(window.ESG_API.hasSession()){
      window.ESG_API.updateTask(id,{status}).catch(()=>{
        if(prev) setTasks(ts=>ts.map(t=>t.id===id?prev:t));
        addToast({title:"Fehler",body:"Status konnte nicht geändert werden."});
      });
    }
  }

  // openTaskById — open task drawer from notification
  function openTaskById(taskId){
    const t = tasks.find(x=>x.id===Number(taskId));
    if(t) setOpenTask(t);
    setShowNotifs(false);
  }

  // deleteTask — optimistisch, Drawer schließen
  function deleteTask(id){
    setTasks(prev=>prev.filter(t=>t.id!==id));
    setOpenTask(null);
    addToast({title:"Aufgabe gelöscht",body:"Die Aufgabe wurde entfernt."});
    if(window.ESG_API.hasSession()){
      window.ESG_API.deleteTask(id).catch(()=>{
        addToast({title:"Fehler",body:"Aufgabe konnte nicht gelöscht werden."});
      });
    }
  }

  // Bereiche (Teams): umbenennen / löschen / anlegen.
  // TEAMS ist ein modulweites Array — in place mutieren + Re-Render erzwingen,
  // damit alle Komponenten (Sidebar, Banner, Modals) die Änderung sehen.
  const [,setTeamsRev] = useState(0);
  function renameTeam(id, name){
    const team = window.ESG_DATA.TEAMS.find(x=>x.id===id);
    if(!team || !name.trim()) return;
    const prev = team.name;
    team.name = name.trim();
    setTeamsRev(r=>r+1);
    if(window.ESG_API.hasSession() && team._real){
      window.ESG_API.updateTeam(id,{name:team.name}).catch(err=>{
        team.name = prev;
        setTeamsRev(r=>r+1);
        addToast({title:"Fehler",body:err.error||"Name konnte nicht gespeichert werden."});
      });
    }
  }
  function updateTeamProp(id, patch){
    const team = window.ESG_DATA.TEAMS.find(x=>x.id===id);
    if(!team) return;
    const prev = {...team};
    Object.assign(team, patch);
    setTeamsRev(r=>r+1);
    if(window.ESG_API.hasSession() && team._real){
      window.ESG_API.updateTeam(id, patch).catch(err=>{
        Object.assign(team, prev);
        setTeamsRev(r=>r+1);
        addToast({title:"Fehler",body:err.error||"Bereich konnte nicht gespeichert werden."});
      });
    }
  }
  function reorderTeams(fromId, toId){
    const arr = window.ESG_DATA.TEAMS;
    const si = arr.findIndex(t=>t.id===fromId);
    const ti = arr.findIndex(t=>t.id===toId);
    if(si<0||ti<0||si===ti) return;
    const [item] = arr.splice(si,1);
    arr.splice(ti,0,item);
    setTeamsRev(r=>r+1);
  }
  function deleteTeam(id){
    const arr = window.ESG_DATA.TEAMS;
    const i = arr.findIndex(x=>x.id===id);
    if(i<0) return;
    const [removed] = arr.splice(i,1);
    setTeamsRev(r=>r+1);
    if(activeTeam===id) setActiveTeam("all");
    // Aufgaben/Notizen behalten ihre team_id=NULL serverseitig; lokal lösen:
    setTasks(prev=>prev.map(t=>t.teamId===id?{...t,teamId:null}:t));
    setNotes(prev=>prev.map(n=>n.teamId===id?{...n,teamId:null}:n));
    addToast({title:"Bereich gelöscht",body:`<b>${removed.name}</b> wurde entfernt.`});
    if(window.ESG_API.hasSession()){
      window.ESG_API.deleteTeam(id).catch(()=>{});
    }
  }
  function createTeam(name, color="#6178FE", icon="📁"){
    if(!name.trim()) return;
    const arr = window.ESG_DATA.TEAMS;
    if(window.ESG_API.hasSession()){
      window.ESG_API.createTeam(name.trim(), color, icon)
        .then(saved=>{
          arr.push(saved);
          setTeamsRev(r=>r+1);
          addToast({title:"Bereich erstellt",body:`<b>${saved.name}</b> wurde angelegt.`,icon:"checkCircle",color:"var(--st-done-bg)",iconColor:"var(--st-done)"});
        })
        .catch(err=>addToast({title:"Fehler",body:err.error||"Bereich konnte nicht erstellt werden."}));
    } else {
      const id = Math.max(0,...arr.map(t=>t.id))+1;
      arr.push({id, name:name.trim(), icon, color, members:[ME.id]});
      setTeamsRev(r=>r+1);
    }
  }

  // ⌘K → Fokus auf Suche
  useEffect(()=>{
    function hk(e){
      if((e.metaKey||e.ctrlKey) && e.key==="k"){
        e.preventDefault();
        const inp = document.querySelector(".search input");
        if(inp){ inp.focus(); inp.select(); }
      }
    }
    window.addEventListener("keydown",hk);
    return ()=>window.removeEventListener("keydown",hk);
  },[]);

  // Service Worker einmalig registrieren
  useEffect(()=>{ registerServiceWorker(); },[]);

  // Begrüßung nach Login — Vollbild-Splash, verschwindet nach 3 s von selbst
  useEffect(()=>{
    if(screen!=="app") return;
    let cancelled = false;
    const timers = [];
    (async()=>{
      let name = ME.name.split(" ")[0];
      let user = null;
      if(window.ESG_API.hasSession()){
        try{
          const r = await window.ESG_API.me();
          user = r.user || r;
          if(user && user.name) name = user.name.split(" ")[0];
        }catch(_){}
      }
      if(cancelled) return;

      // Eingeloggten Nutzer in ME übernehmen — Avatare zeigen die echten Initialen
      if(user && user.name){
        ME.id    = Number(user.id);
        ME.name  = user.name;
        ME.email = user.email || ME.email;
        ME.initials = user.name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
        if(user.abbreviation) ME.role = "Kürzel: " + user.abbreviation.toUpperCase();
      }

      const hr = new Date().getHours();
      const greet = hr<12 ? "Guten Morgen" : hr<18 ? "Guten Tag" : "Guten Abend";

      setWelcome({greet, name});
      timers.push(setTimeout(()=>setWelcome(w=>w?{...w,out:true}:null), 3000)); // Fade-out starten
      timers.push(setTimeout(()=>setWelcome(null), 3600));                       // entfernen

      // Nach dem Splash: Folge-Hinweise
      timers.push(setTimeout(()=>{
        if(user && Number(user.must_change_password)===1){
          addToast({title:"Passwort ändern 🔐",body:"Du nutzt noch dein Erstpasswort — bitte ändere es jetzt."});
          setMustChangePass(true);
        }
        if(hr>=23 || hr<5){
          addToast({title:"Schlafenszeit 🌙",body:"Du brauchst Erholung!"});
          pushNotify("Schlafenszeit 🌙","Du brauchst Erholung!");
        }
      }, 3600));
    })();
    return ()=>{ cancelled = true; timers.forEach(clearTimeout); };
  },[screen]);

  // Nach Login: Notification-Erlaubnis anfragen
  useEffect(()=>{
    if(screen!=="app") return;
    if("Notification" in window && Notification.permission==="default"){
      Notification.requestPermission().catch(()=>{});
    }
  },[screen]);

  // Echte Aufgaben + Notizen + Benachrichtigungen vom PHP-Backend laden
  useEffect(()=>{
    if(screen!=="app" || !window.ESG_API.hasSession()) return;
    setLoadingTasks(true);
    Promise.all([
      window.ESG_API.getTasks(),
      window.ESG_API.getNotes(),
      window.ESG_API.getNotifications().catch(()=>[]),
      window.ESG_API.getTeams().catch(()=>[]),
      window.ESG_API.getUsers().catch(()=>[]),
      window.ESG_API.me().catch(()=>null),
    ]).then(([t,n,nf,tms,usrs,meResp])=>{
      setTasks(t);
      setNotes(n);
      if(nf.length>0) setNotifs(nf);
      if(tms.length>0){
        const arr = window.ESG_DATA.TEAMS;
        const base = arr.find(x=>x.id===0);
        arr.length = 0;
        if(base) arr.push(base);
        tms.forEach(rt=>arr.push(rt));
        setTeamsRev(r=>r+1);
      }
      if(usrs.length>0){
        const uArr = window.ESG_DATA.USERS;
        uArr.length = 0;
        usrs.forEach(u=>uArr.push(u));
        // Use confirmed ME id from /api/users/me to avoid race with welcome effect
        const realId = meResp?.user?.id ? Number(meResp.user.id) : window.ESG_DATA.ME.id;
        const realMe = usrs.find(u=>u.id===realId);
        if(realMe) Object.assign(window.ESG_DATA.ME, realMe);
        setTeamsRev(r=>r+1);
      }
    }).catch(err=>{
      console.warn("Backend nicht erreichbar, Mock-Daten bleiben aktiv:", err);
      setDemoMode(true);
      addToast({title:"Offline",body:"Backend nicht erreichbar — Demo-Daten werden angezeigt."});
    }).finally(()=>setLoadingTasks(false));
  },[screen]);

  // Echtzeit: WebSocket-Verbindung zum PHP-WS-Server (ws://localhost:8090)
  useEffect(()=>{
    if(screen!=="app" || !window.ESG_API.hasSession()) return;
    let ws, retryTimer, closed=false;

    const userName = id => (USERS.find(u=>u.id===id)||{}).name || "Jemand";

    function handleEvent(event, payload){
      switch(event){
        case "task:created":{
          const task = window.ESG_API.mapTask(payload.task);
          setTasks(prev => prev.some(t=>t.id===task.id) ? prev : [task,...prev]);
          break;
        }
        case "task:updated":{
          const task = window.ESG_API.mapTask(payload.task);
          setTasks(prev => prev.map(t=>t.id===task.id?{...t,...task}:t));
          break;
        }
        case "task:deleted":
          setTasks(prev => prev.filter(t=>t.id!==Number(payload.taskId)));
          break;
        case "comment:added":{
          const taskId = Number(payload.taskId);
          setTasks(prev => prev.map(t=>t.id===taskId?{...t,comments:(t.comments||0)+1}:t));
          setNotifs(prev=>[{id:`n${Date.now()}`,type:"comment",read:false,
            actor:Number(payload.comment?.user_id)||null,taskId,
            text:"hat einen Kommentar hinzugefügt",ts:new Date().toISOString()},...prev]);
          addToast({title:"Neuer Kommentar",body:payload.comment?.text||""});
          pushNotify("Neuer Kommentar", payload.comment?.text||"", {taskId});
          break;
        }
        case "user:assigned":{
          const taskId = Number(payload.taskId);
          setNotifs(prev=>[{id:`n${Date.now()}`,type:"assigned",read:false,
            actor:Number(payload.by)||null,taskId,
            text:`hat dich bei <b>${payload.title}</b> als Verantwortliche:n eingetragen`,
            ts:new Date().toISOString()},...prev]);
          addToast({title:"Neue Aufgabe",body:`<b>${payload.title}</b> wurde dir zugewiesen.`});
          pushNotify("Neue Aufgabe zugewiesen", `${userName(Number(payload.by))}: ${payload.title}`, {taskId});
          break;
        }
        case "team:member_added":
          addToast({title:"Team",body:"Du wurdest zu einem Team hinzugefügt."});
          break;
        case "note:created":{
          const note = window.ESG_API.mapNote(payload.note);
          setNotes(prev => prev.some(n=>n.id===note.id) ? prev : [note,...prev]);
          if(note.createdBy!==ME.id){
            addToast({title:"Neue Notiz",body:`<b>${note.title}</b> wurde geteilt.`});
            pushNotify("Neue Notiz geteilt", note.title, {noteId:note.id});
          }
          break;
        }
        case "note:updated":{
          const note = window.ESG_API.mapNote(payload.note);
          setNotes(prev => prev.map(n=>n.id===note.id?note:n));
          break;
        }
        case "note:deleted":
          setNotes(prev => prev.filter(n=>n.id!==Number(payload.noteId)));
          break;
        case "chat:message":
          window.dispatchEvent(new CustomEvent("esg:chat", {detail: payload}));
          break;
      }
    }

    function connect(){
      const token = localStorage.getItem("accessToken");
      if(!token) return;
      ws = new WebSocket(`${WS_URL}/?token=${encodeURIComponent(token)}`);
      ws.addEventListener("open", ()=>console.log("Echtzeit verbunden:", WS_URL));
      ws.addEventListener("message", e=>{
        try{
          const {event, payload} = JSON.parse(e.data);
          handleEvent(event, payload);
        }catch(err){ console.warn("WS-Nachricht ungültig:", err); }
      });
      // Re-Connect bei Verbindungsabbruch
      ws.addEventListener("close", ()=>{ if(!closed) retryTimer = setTimeout(connect, 2000); });
    }

    connect();
    return ()=>{ closed=true; clearTimeout(retryTimer); ws && ws.close(); };
  },[screen]);

  if(screen==="login") return h(Fragment,null,
    h(LoginScreen,{onLogin:()=>setScreen("app")}),
    h(ToastList,{toasts,dismiss:dismissToast})
  );

  return h(Fragment,null,
    // Sidebar mobile backdrop
    sidebarOpen && h("div",{className:"sb-backdrop open",onClick:()=>setSidebarOpen(false)}),

    h("div",{className:"app"},
      h(Sidebar,{
        activeTeam, setActiveTeam:(t)=>{setSection("tasks");setActiveTeam(t);setFilters({priority:null,status:null,overdue:null});},
        section, setSection,
        open:sidebarOpen, onClose:()=>setSidebarOpen(false),
        onNewTask:()=>setShowNewTask(true),
        onRenameTeam:renameTeam, onDeleteTeam:deleteTeam, onCreateTeam:(name,color,icon)=>createTeam(name,color,icon),
        onUpdateTeam:updateTeamProp, onReorderTeams:reorderTeams,
        onNewTaskInTeam:(teamId)=>{ setActiveTeam(teamId); setSection("tasks"); setShowNewTask(true); },
        width:sbWidth, collapsed:sbCollapsed,
        onWidthChange:w=>{ setSbWidth(w); localStorage.setItem("sb-width",w); },
        onToggleCollapse:()=>setSbCollapsed(v=>{ const nv=!v; localStorage.setItem("sb-collapsed",nv?"1":"0"); return nv; }),
      }),

      h("div",{className:"main"},
        h(Topbar,{
          activeTeam, section, view, setView,
          notifCount:unread,
          onBell:()=>setShowNotifs(p=>!p),
          onMenuOpen:()=>{ if(window.innerWidth<768) setSidebarOpen(true); else setSbCollapsed(v=>{ const nv=!v; localStorage.setItem("sb-collapsed",nv?"1":"0"); return nv; }); },
          searchVal, setSearchVal,
          presenceUsers,
          theme:t.theme, onToggleTheme:()=>setTweak("theme", t.theme==="dark"?"light":"dark"),
          onQuickNote:()=>setShowQuickNote(true)
        }),

        // Team banner
        section==="tasks" && h(TeamBanner,{activeTeam,tasks}),

        // Demo mode banner
        demoMode && h("div",{className:"demo-banner"},
          h(Icon,{n:"alertCircle",size:14}),
          "Demo-Modus — Backend nicht erreichbar. Änderungen werden nicht gespeichert.",
          h("button",{className:"iconbtn btn-sm",onClick:()=>setDemoMode(false),style:{marginLeft:"auto"}},
            h(Icon,{n:"x",size:13})
          )
        ),

        // Notification panel (positioned relative to main)
        showNotifs && h("div",{style:{position:"relative",zIndex:40}},
          h(NotificationPanel,{onClose:()=>setShowNotifs(false),notifs,setNotifs,onOpenTask:openTaskById})
        ),

        h("div",{className:"content"},
          h("div",{className:"content-pad"},
            section==="notes"
              ? h(NotesView,{notes,onSave:saveNote,onDelete:deleteNote,searchVal})
              : section==="chat"
              ? (window.ChatView ? h(window.ChatView,{}) : null)
              : h(Fragment,null,
                  h(Subbar,{filters,setFilters,view,setView,sortBy,setSortBy,tasks:visibleTasks}),
                  view==="list"
                    ? h(ListView,{tasks:visibleTasks,onOpen:setOpenTask,onToggleDone:toggleDone,searchVal,filters,loading:loadingTasks,sortBy})
                    : view==="board"
                    ? h(BoardView,{tasks:visibleTasks,onOpen:setOpenTask,onNewTask:()=>setShowNewTask(true),onMoveTask:moveTask})
                    : view==="calendar"
                    ? h(CalendarView,{tasks:visibleTasks,onOpen:setOpenTask,onNewTask:(date)=>{setDefaultDue(date);setShowNewTask(true);}})
                    : h(KioskView,{tasks:visibleTasks,onToggleDone:toggleDone})
                )
          )
        ),

        // Mobile FAB
        section==="tasks" && h("button",{className:"fab","aria-label":"Neue Aufgabe",onClick:()=>setShowNewTask(true)},
          h(Icon,{n:"plus",size:26})
        )
      )
    ),

    // Drawer
    openTask && h(ErrorBoundary,null,
      h(TaskDrawer,{
        task:openTask,
        onClose:()=>setOpenTask(null),
        onToggleDone:toggleDone,
        onShare:()=>{ setShareTask(openTask); setOpenTask(null); },
        onSave:updateTask,
        onDelete:deleteTask,
      })
    ),

    // Share modal
    shareTask && h(ShareModal,{task:shareTask,onClose:()=>setShareTask(null)}),

    // New task modal
    showNewTask && h(NewTaskModal,{onClose:()=>{ setShowNewTask(false); setDefaultDue(null); },onAdd:addTask,defaultTeam:activeTeam,defaultDue}),

    // Erstpasswort-Zwang: nach erstem Login Passwortwechsel einfordern
    mustChangePass && h(ChangePasswordModal,{
      onDone:()=>{ setMustChangePass(false); addToast({title:"Passwort geändert ✓",body:"Dein neues Passwort ist aktiv.",icon:"checkCircle",color:"var(--st-done-bg)",iconColor:"var(--st-done)"}); },
      onSkip:()=>setMustChangePass(false)
    }),

    // Roter Bugs-Button: minimalistische Checkliste (eine Notiz "Bugs")
    showQuickNote && h(BugChecklistModal,{
      note: notes.find(n=>n.title==="Bugs"),
      onSave: saveNote,
      onClose: ()=>setShowQuickNote(false)
    }),

    // Vollbild-Begrüßung (3 s, dann Auto-Fade)
    welcome && h("div",{className:`welcome-splash${welcome.out?" out":""}`},
      h("img",{src:"assets/esg-mark-ondark.svg",alt:"",className:"ws-logo"}),
      h("h1",null,`${welcome.greet}, ${welcome.name}!`),
      h("p",null,"Schön, dass du da bist.")
    ),

    // Toasts
    h(ToastList,{toasts,dismiss:dismissToast}),

    // Tweaks panel
    h(TweaksPanel,null,
      h(TweakSection,{label:"Erscheinungsbild"}),
      h(TweakToggle,{label:"Dunkelmodus",value:t.theme==="dark",onChange:v=>setTweak("theme",v?"dark":"light")}),
      h(TweakRadio,{label:"Akzentfarbe",value:t.accent,
        options:["indigo","blue","violet","coral"],
        onChange:v=>setTweak("accent",v)}),
      h(TweakSection,{label:"Layout"}),
      h(TweakRadio,{label:"Dichte",value:t.density,
        options:["compact","default","spacious"],
        onChange:v=>setTweak("density",v)}),
      h(TweakRadio,{label:"Standardansicht",value:t.defaultView,
        options:["list","board"],
        onChange:v=>{ setTweak("defaultView",v); setView(v); }})
    )
  );
}

window.App = App;
window._addToast = ()=>_addToast;
ReactDOM.createRoot(document.getElementById("root")).render(h(ErrorBoundary,null,h(App)));
})();
