// ========================================================================
//  ToDo-Schule — List View, Board View, Kiosk View, Subbar
// ========================================================================
(function(){
const {useState, useMemo, useRef} = React;
const {createElement:h, Fragment} = React;
const {TASKS, TEAMS} = window.ESG_DATA;

const TODAY = new Date().toISOString().slice(0,10);
const PRI_ORDER = {high:0, medium:1, low:2};

/* ── Filter bar ──────────────────────────────────────────────────────── */
function FilterBar({filters, setFilters}){
  const opts = [
    {k:"priority",v:"high",   label:"Priorität: Hoch"},
    {k:"priority",v:"medium", label:"Priorität: Mittel"},
    {k:"status",  v:"in_progress",label:"In Bearbeitung"},
    {k:"overdue", v:true,     label:"Überfällig"},
  ];
  function toggle(k,v){
    setFilters(prev => ({...prev,[k]: prev[k]===v ? null : v}));
  }
  return h("div",{className:"filterpills"},
    h("span",{style:{fontSize:12.5,fontWeight:600,color:"var(--text-3)",marginRight:4,display:"flex",alignItems:"center",gap:5}},
      h(Icon,{n:"filter",size:13}),"Filter"
    ),
    opts.map(o => {
      const on = filters[o.k]===o.v;
      return h("button",{key:`${o.k}-${o.v}`,className:`fpill ${on?"on":""}`,onClick:()=>toggle(o.k,o.v)},
        on && h(Icon,{n:"x",size:12,className:"x"}),
        o.label
      );
    })
  );
}

/* ── Task row (list view) ────────────────────────────────────────────── */
function TaskRow({task, onOpen, onToggleDone}){
  const team = TEAMS.find(t=>t.id===task.teamId);
  const hasSubs = task.subtasks && task.subtasks.length > 0;
  const doneSubs = hasSubs ? task.subtasks.filter(s=>s.done).length : 0;
  return h("div",{className:`trow ${task.status==="done"?"done":""}`,onClick:()=>onOpen(task)},
    h(PriEdge,{priority:task.priority}),
    h("button",{className:`check ${task.status==="done"?"on":""}`,
      onClick:e=>{e.stopPropagation();onToggleDone(task.id)},
      "aria-label":"Erledigt markieren"},
      h(Icon,{n:"check",size:13,strokeWidth:2.5})
    ),
    h("div",{className:"tbody"},
      h("div",{className:"tt"},task.title),
      h("div",{className:"tmeta"},
        h(StatusChip,{status:task.status}),
        h(PriorityChip,{priority:task.priority}),
        h(DueChip,{due:task.due}),
        hasSubs && h("span",{className:"chip chip-ghost",title:"Unteraufgaben"},
          h(Icon,{n:"checkCircle",size:11}),` ${doneSubs}/${task.subtasks.length}`
        ),
        task.tags && task.tags.length > 0 && task.tags.slice(0,2).map(tag=>
          h("span",{key:tag,className:"chip chip-tag"},tag)
        ),
        team && h("span",{className:"chip chip-ghost"},
          h(TagDot,{color:team.color,size:8}),team.name
        )
      )
    ),
    h("div",{className:"tright"},
      task.comments > 0 && h("div",{className:"cmt"},
        h(Icon,{n:"messageCircle",size:14}), task.comments
      ),
      task.assignees.length > 0 && h(AvatarStack,{userIds:task.assignees,size:"xs"})
    )
  );
}

/* ── Skeleton row ────────────────────────────────────────────────────── */
function SkeletonRow(){
  return h("div",{className:"trow",style:{pointerEvents:"none"}},
    h("div",{className:"skel-line",style:{width:20,height:20,borderRadius:99,flex:"none"}}),
    h("div",{className:"tbody",style:{gap:8}},
      h("div",{className:"skel-line",style:{width:"60%",height:15}}),
      h("div",{className:"skel-line",style:{width:"35%",height:12}})
    )
  );
}

/* ── List View ───────────────────────────────────────────────────────── */
function ListView({tasks, onOpen, onToggleDone, searchVal, filters, loading, sortBy}){
  const filtered = useMemo(()=>{
    let t = [...tasks];
    if(searchVal) t = t.filter(tk=>tk.title.toLowerCase().includes(searchVal.toLowerCase()));
    if(filters.priority) t = t.filter(tk=>tk.priority===filters.priority);
    if(filters.status)   t = t.filter(tk=>tk.status===filters.status);
    if(filters.overdue)  t = t.filter(tk=>tk.due && tk.due < TODAY && tk.status!=="done");
    if(sortBy==="due")      t.sort((a,b)=>{ if(!a.due&&!b.due) return 0; if(!a.due) return 1; if(!b.due) return -1; return a.due.localeCompare(b.due); });
    else if(sortBy==="priority") t.sort((a,b)=>(PRI_ORDER[a.priority]??1)-(PRI_ORDER[b.priority]??1));
    else if(sortBy==="name")     t.sort((a,b)=>a.title.localeCompare(b.title,"de"));
    return t;
  },[tasks,searchVal,filters,sortBy]);

  const inProg = filtered.filter(t=>t.status==="in_progress");
  const todo   = filtered.filter(t=>t.status==="todo");
  const done   = filtered.filter(t=>t.status==="done");

  if(loading) return h("div",{className:"tasklist"},[1,2,3,4,5].map(i=>h(SkeletonRow,{key:i})));

  if(!filtered.length) return h("div",{className:"empty"},
    h("div",{className:"ic"},h(Icon,{n:"checkCircle",size:28})),
    h("h3",null,"Alles erledigt!"),
    h("p",null,"Keine Aufgaben entsprechen deinen Filtern.")
  );

  function Group({label, items, dot}){
    if(!items.length) return null;
    return h(Fragment,null,
      h("div",{className:"group-h"},
        h("span",{className:"tick",style:{width:8,height:8,borderRadius:99,background:dot,display:"inline-block"}}),
        h("span",null,label),
        h("span",{className:"ct"},items.length),
        h("div",{className:"ln"})
      ),
      items.map(t=>h(TaskRow,{key:t.id,task:t,onOpen,onToggleDone}))
    );
  }

  return h("div",{className:"tasklist"},
    h(Group,{label:"In Bearbeitung",items:inProg,dot:"var(--st-prog)"}),
    h(Group,{label:"Offen",         items:todo,  dot:"var(--st-todo)"}),
    done.length > 0 && h(Group,{label:"Erledigt",items:done,dot:"var(--st-done)"})
  );
}

/* ── Board card ──────────────────────────────────────────────────────── */
function BoardCard({task, onOpen, onDragStart, onDragEnd}){
  const team = TEAMS.find(t=>t.id===task.teamId);
  const hasSubs = task.subtasks && task.subtasks.length > 0;
  const doneSubs = hasSubs ? task.subtasks.filter(s=>s.done).length : 0;
  return h("div",{
    className:`bcard ${task.status==="done"?"done":""}`,
    draggable:true,
    onClick:()=>onOpen(task),
    onDragStart:e=>onDragStart(e,task),
    onDragEnd:onDragEnd,
  },
    h("div",{className:"bc-top"},
      h(PriorityChip,{priority:task.priority}),
      team && h("span",{className:"chip chip-ghost",style:{fontSize:11.5,height:22,padding:"0 8px"}},
        h(TagDot,{color:team.color,size:7}),team.name
      )
    ),
    h("div",{className:"bc-t"},task.title),
    hasSubs && h("div",{className:"bc-subs"},
      h(Icon,{n:"checkCircle",size:11}),` ${doneSubs}/${task.subtasks.length}`
    ),
    h("div",{className:"bc-foot"},
      h(DueChip,{due:task.due}),
      h("div",{className:"sp"}),
      task.comments > 0 && h("span",{style:{display:"flex",alignItems:"center",gap:4,fontSize:12,color:"var(--text-3)",fontWeight:600}},
        h(Icon,{n:"messageCircle",size:13}),task.comments
      ),
      task.assignees.length > 0 && h(AvatarStack,{userIds:task.assignees,size:"xs"})
    )
  );
}

/* ── Board View ──────────────────────────────────────────────────────── */
const COLS = [
  {key:"todo",        label:"Offen",         dot:"var(--st-todo)"},
  {key:"in_progress", label:"In Bearbeitung",dot:"var(--st-prog)"},
  {key:"done",        label:"Erledigt",      dot:"var(--st-done)"},
];

function BoardView({tasks, onOpen, onNewTask, onMoveTask}){
  const [dragOver, setDragOver] = useState(null);
  const dragTask = useRef(null);

  function handleDragStart(e, task){
    dragTask.current = task;
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd(){
    dragTask.current = null;
    setDragOver(null);
  }
  function handleDragOver(e, colKey){
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if(dragTask.current && dragTask.current.status !== colKey) setDragOver(colKey);
  }
  function handleDrop(e, targetStatus){
    e.preventDefault();
    const t = dragTask.current;
    dragTask.current = null;
    setDragOver(null);
    if(t && t.status !== targetStatus && onMoveTask) onMoveTask(t.id, targetStatus);
  }

  return h("div",{className:"board"},
    COLS.map(col => {
      const cards = tasks.filter(t=>t.status===col.key);
      const isOver = dragOver === col.key;
      return h("div",{key:col.key,
        className:`bcol ${isOver?"drag-over":""}`,
        onDragOver:e=>handleDragOver(e,col.key),
        onDragLeave:()=>{ if(dragTask.current) setDragOver(null); },
        onDrop:e=>handleDrop(e,col.key),
      },
        h("div",{className:"bcol-h"},
          h("span",{className:"tick",style:{background:col.dot}}),
          h("span",{className:"nm"},col.label),
          h("span",{className:"ct"},cards.length),
          h("button",{className:"add iconbtn btn-sm",onClick:onNewTask,title:"Aufgabe hinzufügen"},
            h(Icon,{n:"plus",size:14})
          )
        ),
        h("div",{className:"bcol-body"},
          cards.length === 0
            ? h("div",{className:"bcol-empty"},
                h(Icon,{n:"inbox",size:20}),
                h("span",null,"Keine Aufgaben")
              )
            : cards.map(t=>h(BoardCard,{key:t.id,task:t,onOpen,
                onDragStart:handleDragStart,onDragEnd:handleDragEnd}))
        ),
        h("button",{className:"bcard-add",onClick:onNewTask},
          h(Icon,{n:"plus",size:14}),"Aufgabe hinzufügen"
        )
      );
    })
  );
}

/* ── Kiosk View (Tagesansicht für Klassenzimmer) ─────────────────────── */
function KioskView({tasks, onToggleDone}){
  const urgent  = tasks.filter(t=>t.status!=="done"&&(t.due===TODAY||t.status==="in_progress"));
  const pending = tasks.filter(t=>t.status==="todo"&&t.due!==TODAY);
  const done    = tasks.filter(t=>t.status==="done");

  function KioskCard({task}){
    const team = TEAMS.find(t=>t.id===task.teamId);
    return h("div",{
      className:`kiosk-card ${task.status==="in_progress"?"active":""}`,
      onClick:()=>onToggleDone(task.id),
    },
      h("div",{className:"kiosk-card-bar",style:{background:team?.color||"var(--accent)"}}),
      h("div",{className:"kiosk-card-body"},
        h("div",{className:"kiosk-card-title"},task.title),
        h("div",{className:"kiosk-card-meta"},
          team && h("span",null,team.icon," ",team.name),
          task.due && h("span",null,shortDate(task.due))
        )
      ),
      h("div",{className:"kiosk-check"},
        h(Icon,{n:"check",size:22})
      )
    );
  }

  return h("div",{className:"kiosk"},
    h("div",{className:"kiosk-header"},
      h("div",{className:"kiosk-date"},
        new Date().toLocaleDateString("de-DE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})
      ),
      h("div",{className:"kiosk-stats"},
        h("span",null,`${urgent.length + pending.length} offen`),
        h("span",null,"·"),
        h("span",null,`${done.length} erledigt`)
      )
    ),
    urgent.length > 0 && h(Fragment,null,
      h("div",{className:"kiosk-section-h"},"Heute & In Bearbeitung"),
      h("div",{className:"kiosk-grid"},urgent.map(t=>h(KioskCard,{key:t.id,task:t})))
    ),
    pending.length > 0 && h(Fragment,null,
      h("div",{className:"kiosk-section-h"},"Ausstehend"),
      h("div",{className:"kiosk-grid"},pending.map(t=>h(KioskCard,{key:t.id,task:t})))
    ),
    urgent.length===0&&pending.length===0 && h("div",{className:"kiosk-empty"},
      h("div",{style:{fontSize:64}},"✅"),
      h("h2",null,"Alles erledigt!"),
      h("p",null,"Keine offenen Aufgaben für heute.")
    )
  );
}

/* ── CSV Export ──────────────────────────────────────────────────────── */
function exportToCSV(tasks){
  const headers = ["Titel","Status","Priorität","Fällig am","Bereich","Zugewiesen","Erstellt am"];
  const STATUS_DE = {todo:"Offen",in_progress:"In Bearbeitung",done:"Erledigt"};
  const PRI_DE    = {high:"Hoch",medium:"Mittel",low:"Niedrig"};
  const rows = tasks.map(t=>[
    `"${(t.title||"").replace(/"/g,'""')}"`,
    STATUS_DE[t.status]||t.status,
    PRI_DE[t.priority]||t.priority,
    t.due||"",
    (TEAMS.find(x=>x.id===t.teamId)?.name)||"",
    (t.assignees||[]).length,
    t.createdAt?t.createdAt.slice(0,10):"",
  ]);
  const csv = [headers.join(";"),...rows.map(r=>r.join(";"))].join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
  const url  = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"),{href:url,download:`aufgaben-${TODAY}.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Subbar wrapper ──────────────────────────────────────────────────── */
function Subbar({filters, setFilters, view, setView, sortBy, setSortBy, tasks}){
  return h("div",{className:"subbar"},
    h(FilterBar,{filters,setFilters}),
    h("div",{className:"sp"}),
    view==="list" && h("select",{
      className:"input btn-sm",
      style:{fontSize:13,height:32,width:"auto",paddingLeft:10,paddingRight:28,cursor:"pointer"},
      value:sortBy||"default",onChange:e=>setSortBy(e.target.value),title:"Sortierung"
    },
      h("option",{value:"default"},"Standard"),
      h("option",{value:"due"},"Fälligkeit"),
      h("option",{value:"priority"},"Priorität"),
      h("option",{value:"name"},"Name A–Z")
    ),
    tasks && tasks.length > 0 && h("button",{
      className:"iconbtn btn-sm",title:"Als CSV exportieren",
      onClick:()=>exportToCSV(tasks)
    },h(Icon,{n:"download",size:15}))
  );
}

Object.assign(window,{ListView, BoardView, KioskView, Subbar, FilterBar, exportToCSV});
})();
