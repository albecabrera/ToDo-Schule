// dist/palette.js — ToDo-Schule · Command Palette (⌘K)
// Springt zu Aufgaben, Notizen, Kolleg:innen oder führt Aktionen aus.
(function(){
"use strict";
const{useState:S,useEffect:v,useRef:T}=React,h=React.createElement;

function buildItems(q){
  const cmd=window.ESG_CMD||{};
  const{USERS,ME}=window.ESG_DATA||{USERS:[],ME:{}};
  const tasks=cmd.tasks||[], notes=cmd.notes||[];
  const ql=q.trim().toLowerCase();
  const match=t=>!ql||(t||"").toLowerCase().includes(ql);
  const items=[];

  // Aktionen
  const actions=[
    {icon:"plus",label:"Neue Aufgabe",hint:"Aktion",run:()=>cmd.newTask&&cmd.newTask()},
    {icon:"list",label:"Alle Aufgaben",hint:"Ansicht",run:()=>{cmd.setSection&&cmd.setSection("tasks");cmd.setView&&cmd.setView("list");}},
    {icon:"layout",label:"Board",hint:"Ansicht",run:()=>{cmd.setSection&&cmd.setSection("tasks");cmd.setView&&cmd.setView("board");}},
    {icon:"calendar",label:"Kalender",hint:"Ansicht",run:()=>{cmd.setSection&&cmd.setSection("tasks");cmd.setView&&cmd.setView("calendar");}},
    {icon:"monitor",label:"Vollbild",hint:"Ansicht",run:()=>{cmd.setSection&&cmd.setSection("tasks");cmd.setView&&cmd.setView("kiosk");}},
    {icon:"messageCircle",label:"Chat",hint:"Ansicht",run:()=>cmd.setSection&&cmd.setSection("chat")},
    {icon:"book",label:"Notizen & Planungen",hint:"Ansicht",run:()=>cmd.setSection&&cmd.setSection("notes")},
    {icon:"moon",label:"Hell/Dunkel umschalten",hint:"Aktion",run:()=>cmd.toggleTheme&&cmd.toggleTheme()},
  ].filter(a=>match(a.label));
  actions.forEach(a=>items.push(a));

  // Aufgaben
  tasks.filter(t=>match(t.title)).slice(0,6).forEach(t=>items.push({
    icon:"check",label:t.title,hint:"Aufgabe",
    run:()=>{cmd.setSection&&cmd.setSection("tasks");cmd.openTask&&cmd.openTask(t.id);}
  }));

  // Notizen
  notes.filter(n=>match(n.title)).slice(0,5).forEach(n=>items.push({
    icon:"book",label:n.title||"Notiz",hint:"Notiz",
    run:()=>cmd.setSection&&cmd.setSection("notes")
  }));

  // Kolleg:innen → DM
  (USERS||[]).filter(u=>u.id!==ME.id&&match(u.name)).slice(0,5).forEach(u=>items.push({
    icon:"messageCircle",label:u.name,hint:"Direktnachricht",
    run:()=>{cmd.setSection&&cmd.setSection("chat");setTimeout(()=>window.dispatchEvent(new CustomEvent("esg:open-dm",{detail:{userId:u.id}})),60);}
  }));

  return items.slice(0,20);
}

function CommandPalette(){
  const[open,setOpen]=S(false);
  const[q,setQ]=S("");
  const[idx,setIdx]=S(0);
  const inputRef=T(null);

  v(()=>{
    function onOpen(){setOpen(true);setQ("");setIdx(0);}
    window.addEventListener("esg:open-palette",onOpen);
    return()=>window.removeEventListener("esg:open-palette",onOpen);
  },[]);
  v(()=>{if(open&&inputRef.current)inputRef.current.focus();},[open]);

  const items=open?buildItems(q):[];
  function exec(i){const it=items[i];if(!it)return;setOpen(false);try{it.run();}catch(e){}}
  function onKey(e){
    if(e.key==="Escape"){setOpen(false);return;}
    if(e.key==="ArrowDown"){e.preventDefault();setIdx(x=>Math.min(items.length-1,x+1));}
    else if(e.key==="ArrowUp"){e.preventDefault();setIdx(x=>Math.max(0,x-1));}
    else if(e.key==="Enter"){e.preventDefault();exec(idx);}
  }

  if(!open)return null;
  return h("div",{className:"cmdk-scrim",onClick:()=>setOpen(false)},
    h("div",{className:"cmdk",onClick:e=>e.stopPropagation()},
      h("div",{className:"cmdk-input-row"},
        h(Icon,{n:"search",size:18}),
        h("input",{ref:inputRef,className:"cmdk-input",placeholder:"Suchen oder Aktion… (↑↓ Enter)",value:q,
          onChange:e=>{setQ(e.target.value);setIdx(0);},onKeyDown:onKey})
      ),
      h("div",{className:"cmdk-list"},
        items.length===0&&h("div",{className:"cmdk-empty"},"Keine Treffer"),
        items.map((it,i)=>h("button",{key:i,className:"cmdk-item"+(i===idx?" active":""),
          onMouseEnter:()=>setIdx(i),onClick:()=>exec(i)},
          h("span",{className:"cmdk-ico"},h(Icon,{n:it.icon,size:16})),
          h("span",{className:"cmdk-label"},it.label),
          h("span",{className:"cmdk-hint"},it.hint)
        ))
      )
    )
  );
}
window.CommandPalette=CommandPalette;
})();
