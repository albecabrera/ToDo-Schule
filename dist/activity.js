// dist/activity.js — ToDo-Schule · Globaler Aktivitäts-Feed
// Zeigt wer was wann getan hat — filterbar nach Bereich und Lehrkraft.
(function(){
"use strict";
const{useState:S,useEffect:v,useCallback:cb,useRef:T}=React,h=React.createElement;

// ── Action → Label + Icon ────────────────────────────────────────────────────
const ACTION_META={
  "task.created":   {label:"Aufgabe erstellt",    icon:"plus",       cls:"act-created"},
  "task.updated":   {label:"Aufgabe bearbeitet",  icon:"edit2",      cls:"act-updated"},
  "task.done":      {label:"Aufgabe erledigt",    icon:"checkCircle",cls:"act-done"},
  "task.reopened":  {label:"Wieder geöffnet",     icon:"refreshCw",  cls:"act-reopen"},
  "task.assigned":  {label:"Zugewiesen",           icon:"userPlus",   cls:"act-assign"},
  "task.unassigned":{label:"Zuweisung entfernt",  icon:"userMinus",  cls:"act-unassign"},
  "task.deleted":   {label:"Aufgabe gelöscht",    icon:"trash2",     cls:"act-deleted"},
};
function meta(action){return ACTION_META[action]||{label:action,icon:"activity",cls:"act-generic"};}

// ── Relative Zeit ─────────────────────────────────────────────────────────────
function relTime(iso){
  const d=new Date(iso),now=Date.now(),diff=Math.round((now-d.getTime())/1000);
  if(diff<60)return "gerade eben";
  if(diff<3600)return Math.floor(diff/60)+" Min.";
  if(diff<86400)return Math.floor(diff/3600)+" Std.";
  if(diff<604800)return Math.floor(diff/86400)+" Tage";
  return d.toLocaleDateString("de-DE",{day:"2-digit",month:"short"});
}

// ── Änderungs-Diff lesbar machen ─────────────────────────────────────────────
function DiffChips({changes}){
  if(!changes)return null;
  const{before,after}=changes;
  if(!before||!after)return null;
  const LABELS={title:"Titel",status:"Status",priority:"Priorität",due_date:"Fällig am",
    description:"Beschreibung",team_id:"Bereich",recurrence:"Wiederholung"};
  const keys=Object.keys(after).filter(k=>before[k]!==undefined&&before[k]!==after[k]);
  if(!keys.length)return null;
  return h("div",{className:"act-diff"},
    keys.map(k=>h("span",{key:k,className:"act-chip"},
      h("span",{className:"act-chip-key"},LABELS[k]||k),
      h("span",{className:"act-chip-before"},String(before[k]||"–")),
      "→",
      h("span",{className:"act-chip-after"},String(after[k]||"–"))
    ))
  );
}

// ── Einzelner Eintrag ─────────────────────────────────────────────────────────
function ActivityEntry({entry,onClickTask}){
  const m=meta(entry.action);
  return h("div",{className:"act-entry"},
    h("div",{className:"act-dot-col"},
      h("div",{className:"act-line"}),
      h("div",{className:"act-dot "+m.cls},h(Icon,{n:m.icon,size:13}))
    ),
    h("div",{className:"act-body"},
      h("div",{className:"act-head"},
        h("span",{className:"act-who"},entry.user_name||"System"),
        h("span",{className:"act-verb"},m.label),
        entry.task_title&&h("button",{className:"act-task-link",onClick:()=>onClickTask&&onClickTask(entry.task_id)},
          '"'+entry.task_title+'"'
        ),
        entry.team_name&&h("span",{className:"act-team"},entry.team_name)
      ),
      h(DiffChips,{changes:entry.changes}),
      h("time",{className:"act-time",dateTime:entry.created_at},relTime(entry.created_at))
    )
  );
}

// ── Filterpanel ───────────────────────────────────────────────────────────────
function ActivityFilters({filters,setFilters}){
  const{TEAMS,USERS,ME}=window.ESG_DATA||{TEAMS:[],USERS:[],ME:{}};
  function set(k,v){setFilters(p=>({...p,[k]:v==="all"?"":v}));}
  const actions=["all","task.created","task.done","task.updated","task.assigned"];
  const actionLabels={"all":"Alle Aktionen","task.created":"Erstellt",
    "task.done":"Erledigt","task.updated":"Bearbeitet","task.assigned":"Zugewiesen"};
  return h("div",{className:"act-filters"},
    h("select",{className:"act-sel",value:filters.team_id||"all",onChange:e=>set("team_id",e.target.value)},
      h("option",{value:"all"},"Alle Bereiche"),
      (TEAMS||[]).filter(t=>t.id!==0).map(t=>h("option",{key:t.id,value:t.id},t.name))
    ),
    h("select",{className:"act-sel",value:filters.user_id||"all",onChange:e=>set("user_id",e.target.value)},
      h("option",{value:"all"},"Alle Lehrkräfte"),
      (USERS||[]).map(u=>h("option",{key:u.id,value:u.id},u.name))
    ),
    h("select",{className:"act-sel",value:filters.action||"all",onChange:e=>set("action",e.target.value)},
      actions.map(a=>h("option",{key:a,value:a},actionLabels[a]||a))
    )
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
function ActivityView({onOpenTask}){
  const[entries,setEntries]=S([]);
  const[loading,setLoading]=S(true);
  const[filters,setFilters]=S({team_id:"",user_id:"",action:"",limit:50});
  const abortRef=T(null);

  const load=cb(async function(f){
    setLoading(true);
    if(abortRef.current)abortRef.current.abort();
    const ctrl=new AbortController();abortRef.current=ctrl;
    try{
      const params=new URLSearchParams();
      if(f.team_id)params.set("team_id",f.team_id);
      if(f.user_id)params.set("user_id",f.user_id);
      if(f.action) params.set("action",f.action);
      params.set("limit",String(f.limit||50));
      const r=await window.ESG_API.fetch("/api/activity?"+params.toString());
      if(!ctrl.signal.aborted)setEntries(r.activity||[]);
    }catch(e){if(!ctrl.signal.aborted)setEntries([]);}
    if(!ctrl.signal.aborted)setLoading(false);
  },[]);

  v(()=>{load(filters);},[filters]);

  // Live-Update wenn WS meldet task:* events
  v(()=>{
    function onEvent(){load(filters);}
    window.addEventListener("esg:task-changed",onEvent);
    return()=>window.removeEventListener("esg:task-changed",onEvent);
  },[filters,load]);

  function loadMore(){setFilters(f=>({...f,limit:(f.limit||50)+50}));}

  return h("div",{className:"act-view"},
    h("div",{className:"act-header"},
      h("h2",{className:"act-title"},h(Icon,{n:"activity",size:18}),"Aktivität"),
      h("button",{className:"iconbtn",title:"Aktualisieren",onClick:()=>load(filters)},h(Icon,{n:"refreshCw",size:16}))
    ),
    h(ActivityFilters,{filters,setFilters}),
    loading&&entries.length===0&&h("div",{className:"act-loading"},h(Icon,{n:"activity",size:22,className:"spin"}),"Wird geladen…"),
    !loading&&entries.length===0&&h("div",{className:"act-empty"},
      h(Icon,{n:"inbox",size:32}),
      h("p",null,"Keine Aktivität gefunden.")
    ),
    h("div",{className:"act-feed"},
      entries.map(e=>h(ActivityEntry,{key:e.id,entry:e,onClickTask:onOpenTask}))
    ),
    !loading&&entries.length>0&&entries.length>=filters.limit&&
      h("button",{className:"act-more",onClick:loadMore},"Ältere laden…")
  );
}
window.ActivityView=ActivityView;
})();
