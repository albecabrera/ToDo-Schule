// ========================================================================
//  ToDo-Schule — Overlays (Notifications, Share, NewTask, Toasts)
// ========================================================================
(function(){
const {useState,useEffect,useRef} = React;
const {createElement:h,Fragment} = React;
const {ME, USERS, TEAMS, NOTIFICATIONS: INIT_NOTIFS} = window.ESG_DATA;

/* ── Notification Panel ──────────────────────────────────────────────── */
function NotificationPanel({onClose, notifs, setNotifs, onOpenTask}){
  const [tab, setTab] = useState("all");
  const ref = useRef();
  useEffect(()=>{
    function hd(e){ if(ref.current&&!ref.current.contains(e.target)) onClose(); }
    setTimeout(()=>document.addEventListener("mousedown",hd),0);
    return ()=>document.removeEventListener("mousedown",hd);
  },[]);

  const filtered = tab==="all" ? notifs : notifs.filter(n=>!n.read);
  const unreadCount = notifs.filter(n=>!n.read).length;

  function markAllRead(){
    setNotifs(ns=>ns.map(n=>({...n,read:true})));
    if(window.ESG_API.hasSession()) window.ESG_API.markAllNotifsRead().catch(()=>{});
  }
  function markRead(id){
    setNotifs(ns=>ns.map(n=>n.id===id?{...n,read:true}:n));
    if(window.ESG_API.hasSession()) window.ESG_API.markNotifRead(id).catch(()=>{});
  }

  return h("div",{ref,className:"notif-panel","aria-label":"Benachrichtigungen"},
    h("div",{className:"notif-head"},
      h("h3",null,"Benachrichtigungen"),
      unreadCount > 0 && h("span",{className:"badge badge-new"},unreadCount),
      h("div",{className:"sp"}),
      unreadCount > 0 && h("button",{className:"btn btn-ghost btn-sm",onClick:markAllRead},
        h(Icon,{n:"checkCircle",size:14}),"Alle gelesen"
      ),
      h("button",{className:"iconbtn btn-sm",onClick:onClose},h(Icon,{n:"x",size:16}))
    ),
    h("div",{className:"notif-tabs"},
      h("button",{className:`notif-tab ${tab==="all"?"on":""}`,onClick:()=>setTab("all")},"Alle"),
      h("button",{className:`notif-tab ${tab==="unread"?"on":""}`,onClick:()=>setTab("unread")},
        "Ungelesen",
        unreadCount > 0 && h("span",{className:"badge badge-new",style:{marginLeft:6,fontSize:10,height:17,padding:"0 6px"}},unreadCount)
      )
    ),
    h("div",{className:"notif-list"},
      filtered.length === 0
        ? h("div",{className:"empty",style:{padding:"30px 16px"}},
            h("div",{className:"ic"},h(Icon,{n:"bell",size:22})),
            h("p",null,"Keine Benachrichtigungen")
          )
        : filtered.map(n => {
          const actor = USERS.find(u=>u.id===n.actor);
          return h("div",{key:n.id,className:`notif ${!n.read?"unread":""}`,
            onClick:()=>{ markRead(n.id); if(n.taskId&&onOpenTask) onOpenTask(n.taskId); }},
            actor ? h(Avatar,{userId:n.actor,size:"xs"}) : h(NotifIcon,{type:n.type}),
            h("div",{className:"grow"},
              h("div",{className:"ntext",dangerouslySetInnerHTML:{__html:n.text}}),
              h("div",{className:"ntime"},relTime(n.ts))
            ),
            h(NotifIcon,{type:n.type})
          );
        })
    ),
    h("div",{className:"notif-foot"},
      h("button",{className:"btn btn-ghost btn-sm",style:{color:"var(--accent)"}},
        "Alle Benachrichtigungen anzeigen"
      )
    )
  );
}

/* ── Share Modal ─────────────────────────────────────────────────────── */
function ShareModal({task, onClose}){
  const [perm, setPerm] = useState("view");
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState(`${window.location.origin}${window.location.pathname}?share=${task.id}`);
  useEffect(()=>{
    if(!window.ESG_API.hasSession()) return;
    window.ESG_API.fetch(`/api/tasks/${task.id}/share`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({permission:perm})})
      .then(r=>r.json())
      .then(d=>{ if(d.token) setLink(`${window.location.origin}${window.location.pathname}?share=${d.token}`); })
      .catch(()=>{});
  },[perm]);

  function copy(){
    navigator.clipboard?.writeText(link).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  return h(Fragment,null,
    h("div",{className:"scrim",onClick:onClose}),
    h("div",{className:"modal"},
      h("div",{className:"modal-card"},
        h("div",{className:"modal-head"},
          h("div",{style:{width:40,height:40,borderRadius:12,background:"var(--accent-soft)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)"}},
            h(Icon,{n:"share",size:19})
          ),
          h("div",null,
            h("h3",null,"Aufgabe teilen"),
            h("p",{style:{fontSize:13,color:"var(--text-2)",margin:"2px 0 0"}},task.title)
          ),
          h("div",{className:"sp"}),
          h("button",{className:"iconbtn btn-sm",onClick:onClose},h(Icon,{n:"x",size:16}))
        ),
        h("div",{className:"modal-body"},
          h("div",{className:"field"},
            h("label",null,"Freigabe-Berechtigung"),
            h("div",{style:{display:"flex",flexDirection:"column",gap:8}},
              [{k:"view",title:"Lesen",desc:"Kann die Aufgabe sehen, aber nicht bearbeiten",icon:"eye"},
               {k:"edit",title:"Bearbeiten",desc:"Kann die Aufgabe vollständig bearbeiten",icon:"edit"}]
              .map(opt => h("div",{key:opt.k,className:`perm-opt ${perm===opt.k?"on":""}`,onClick:()=>setPerm(opt.k)},
                h("div",{className:"ic"},h(Icon,{n:opt.icon,size:17})),
                h("div",{className:"grow"},
                  h("div",{className:"nm"},opt.title),
                  h("div",{className:"ds"},opt.desc)
                ),
                h("div",{className:"rd"})
              ))
            )
          ),
          h("div",{className:"field"},
            h("label",null,"Link"),
            h("div",{className:"share-link"},
              h("input",{readOnly:true,value:link,"aria-label":"Share-Link"}),
              h("button",{className:`btn btn-primary btn-sm ${copied?"":""}`,onClick:copy},
                copied ? h(Fragment,null,h(Icon,{n:"check",size:14}),"Kopiert!") : h(Fragment,null,h(Icon,{n:"copy",size:14}),"Kopieren")
              )
            ),
            h("p",{className:"field-hint"},"Der Link gibt ",h("b",null,perm==="view"?"Lesezugriff":"Bearbeitungszugriff")," auf diese Aufgabe.")
          ),
          h("div",{className:"field"},
            h("label",null,`Mitglieder (${(task.assignees||[]).length+1})`),
            [(task.createdBy),...(task.assignees||[])].map(id =>
              h("div",{key:id,className:"member-row"},
                h(Avatar,{userId:id,size:"sm",showPresence:true}),
                h("div",null,
                  h("div",{style:{fontSize:13.5,fontWeight:650}},userName(id)),
                  h("div",{style:{fontSize:12,color:"var(--text-3)"}},id===task.createdBy?"Ersteller:in":"Zugewiesen")
                ),
                h("div",{className:"sp"}),
                h("span",{className:"chip",style:{fontSize:12}},id===task.createdBy?"Owner":"Mitglied")
              )
            )
          )
        ),
        h("div",{className:"modal-foot"},
          h("div",{className:"sp"}),
          h("button",{className:"btn btn-outline",onClick:onClose},"Abbrechen"),
          h("button",{className:"btn btn-primary",onClick:onClose},h(Icon,{n:"send",size:15}),"Teilen")
        )
      )
    )
  );
}

/* ── New Task Modal ───────────────────────────────────────────────────── */
function NewTaskModal({onClose, onAdd, defaultTeam, defaultDue}){
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [due, setDue] = useState(defaultDue||"");
  const [remindAt, setRemindAt] = useState("");
  const [teamId, setTeamId] = useState(defaultTeam&&typeof defaultTeam==="number"?defaultTeam:null);
  const [assignees, setAssignees] = useState([]);

  function submit(e){
    e.preventDefault();
    if(!title.trim()) return;
    onAdd({id:Date.now(),title:title.trim(),desc,priority,status,due,remindAt:remindAt||null,
      teamId,assignees,comments:0,createdBy:ME.id,createdAt:new Date().toISOString(),watched:true});
    onClose();
  }

  return h(Fragment,null,
    h("div",{className:"scrim",onClick:onClose}),
    h("div",{className:"modal"},
      h("div",{className:"modal-card wide"},
        h("div",{className:"modal-head"},
          h("h3",null,"Neue Aufgabe"),
          h("div",{className:"sp"}),
          h("button",{className:"iconbtn btn-sm",onClick:onClose},h(Icon,{n:"x",size:16}))
        ),
        h("form",{onSubmit:submit},
          h("div",{className:"modal-body"},
            h("div",{className:"nt-form"},
              h("input",{className:"nt-title",placeholder:"Titel der Aufgabe…",value:title,
                onChange:e=>setTitle(e.target.value),autoFocus:true}),
              h("div",{className:"field"},
                h("label",null,"Beschreibung"),
                h("textarea",{className:"textarea",placeholder:"Optionale Details, Kontext, Links…",
                  value:desc,onChange:e=>setDesc(e.target.value),rows:3})
              ),
              h("div",{className:"nt-row"},
                h("div",{className:"field"},
                  h("label",null,"Priorität"),
                  h("select",{className:"input select",value:priority,onChange:e=>setPriority(e.target.value)},
                    h("option",{value:"high"},"🔴 Hoch"),
                    h("option",{value:"medium"},"🟡 Mittel"),
                    h("option",{value:"low"},"🔵 Niedrig")
                  )
                ),
                h("div",{className:"field"},
                  h("label",null,"Status"),
                  h("select",{className:"input select",value:status,onChange:e=>setStatus(e.target.value)},
                    h("option",{value:"todo"},"Offen"),
                    h("option",{value:"in_progress"},"In Bearbeitung"),
                    h("option",{value:"done"},"Erledigt")
                  )
                )
              ),
              h("div",{className:"nt-row"},
                h("div",{className:"field"},
                  h("label",null,"Fällig am"),
                  h("input",{type:"date",className:"input",value:due,onChange:e=>setDue(e.target.value)})
                ),
                h("div",{className:"field"},
                  h("label",null,"Erinnerung"),
                  h("input",{type:"datetime-local",className:"input",value:remindAt,onChange:e=>setRemindAt(e.target.value)})
                )
              ),
              h("div",{className:"nt-row"},
                h("div",{className:"field"},
                  h("label",null,"Bereich"),
                  h("select",{className:"input select",value:teamId||"",onChange:e=>setTeamId(e.target.value?Number(e.target.value):null)},
                    h("option",{value:""},"Kein Bereich"),
                    TEAMS.filter(t=>t.id!==0).map(t=>h("option",{key:t.id,value:t.id},`${t.icon} ${t.name}`))
                  )
                ),
                h("div",{className:"field"}) // spacer
              ),
              h("div",{className:"field"},
                h("label",null,"Zuweisen"),
                h("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
                  USERS.map(u => {
                    const on = assignees.includes(u.id);
                    return h("div",{key:u.id,
                      onClick:()=>setAssignees(prev=>on?prev.filter(x=>x!==u.id):[...prev,u.id]),
                      style:{display:"flex",alignItems:"center",gap:7,padding:"5px 10px",borderRadius:8,
                        border:`1.5px solid ${on?"var(--accent)":"var(--border)"}`,
                        background:on?"var(--accent-soft)":"var(--surface)",cursor:"pointer",userSelect:"none"}},
                      h(Avatar,{userId:u.id,size:"xs"}),
                      h("span",{style:{fontSize:13,fontWeight:600}},u.name.split(" ")[0]),
                      on && h(Icon,{n:"check",size:12,style:{color:"var(--accent)"}})
                    );
                  })
                )
              )
            )
          ),
          h("div",{className:"modal-foot"},
            h("div",{className:"sp"}),
            h("button",{type:"button",className:"btn btn-outline",onClick:onClose},"Abbrechen"),
            h("button",{type:"submit",className:"btn btn-primary",disabled:!title.trim()},
              h(Icon,{n:"plus",size:16}),"Aufgabe erstellen"
            )
          )
        )
      )
    )
  );
}

/* ── Toast System ────────────────────────────────────────────────────── */
function ToastList({toasts, dismiss}){
  if(!toasts.length) return null;
  return h("div",{className:"toasts","aria-live":"polite"},
    toasts.map(t => h("div",{key:t.id,className:`toast ${t.out?"out":""}`,role:"alert"},
      t.actor ? h(Avatar,{userId:t.actor,size:"sm",className:"tav"}) :
      h("div",{className:"tic",style:{background:t.color||"var(--accent-soft)",color:t.iconColor||"var(--accent)"}},
        h(Icon,{n:t.icon||"bell",size:16})
      ),
      h("div",{className:"tbody"},
        h("div",{className:"tt"},t.title),
        h("div",{className:"tx",dangerouslySetInnerHTML:{__html:t.body}}),
        t.actions && h("div",{className:"tactions"},
          t.actions.map(a => h("button",{key:a.label,className:a.primary?"pri":"",onClick:()=>{a.fn&&a.fn();dismiss(t.id)}},a.label))
        )
      ),
      h("button",{className:"tclose",onClick:()=>dismiss(t.id)},h(Icon,{n:"x",size:14})),
      h("div",{className:"tprog"})
    ))
  );
}

Object.assign(window,{NotificationPanel, ShareModal, NewTaskModal, ToastList});
})();
