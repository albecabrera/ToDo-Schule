// ========================================================================
//  ToDo-Schule — UI Primitives (Avatar, Chip, Badge, helpers)
// ========================================================================
(function(){
const {USERS, ME, TEAMS} = window.ESG_DATA;
const {createElement:h,Fragment} = React;

/* ── Avatar ─────────────────────────────────────────────────────────── */
function Avatar({userId, size="md", showPresence=false, style={}}){
  const u = userId === "me" ? ME : USERS.find(u=>u.id===userId);
  if(!u) return null;
  const inner = u.avatarUrl
    ? h("img",{src:u.avatarUrl,alt:u.name,style:{width:"100%",height:"100%",objectFit:"cover",borderRadius:"inherit",display:"block"}})
    : u.initials;
  return h("span",{className:`av ${size}`,style:{background:u.color,...style},title:u.name},
    inner,
    showPresence && h("span",{className:`pres ${u.presence==="online"?"":u.presence==="away"?"away":"off"}`})
  );
}

function AvatarStack({userIds, size="sm", max=4}){
  const shown = userIds.slice(0,max);
  const extra = userIds.length - max;
  return h("span",{className:"avstack", style:{"--s": size==="xs"?"22px":size==="sm"?"26px":"32px"}},
    ...shown.map(id => h(Avatar,{key:id, userId:id, size})),
    extra > 0 && h("span",{className:"more"},`+${extra}`)
  );
}

/* ── Status / Priority chips ─────────────────────────────────────────── */
const ST_LABELS = {todo:"Offen", in_progress:"In Bearbeitung", done:"Erledigt"};
const PRI_LABELS = {high:"Hoch", medium:"Mittel", low:"Niedrig"};
const PRI_ICONS  = {high:"flag", medium:"minus", low:"chevronDown"};

function StatusChip({status, small=false}){
  const dots = {todo:"#8987A1",in_progress:"#5566F0",done:"#3E9E45"};
  return h("span",{className:`chip chip-st-${status}`},
    h("span",{className:"tick",style:{background:dots[status]}}),
    small ? null : ST_LABELS[status]
  );
}

function PriorityChip({priority}){
  return h("span",{className:`chip chip-pri-${priority}`},
    h(Icon,{n:PRI_ICONS[priority],size:12}),
    PRI_LABELS[priority]
  );
}

function DueChip({due}){
  if(!due) return null;
  const today = new Date(); const d = new Date(due);
  const diff = Math.round((d-today)/86400000);
  const cls = diff < 0 ? "over" : diff <= 2 ? "soon" : "";
  const label = diff < 0 ? `${-diff}d überfällig`
              : diff === 0 ? "Heute"
              : diff === 1 ? "Morgen"
              : `${diff} Tage`;
  return h("span",{className:`chip chip-due ${cls}`},
    h(Icon,{n:"clock",size:12}), label
  );
}

/* ── User lookup helpers ─────────────────────────────────────────────── */
function userName(id){ return USERS.find(u=>u.id===id)?.name || "Unbekannt"; }
function userRole(id){ return USERS.find(u=>u.id===id)?.role || ""; }

function teamName(teamId){
  return TEAMS.find(t=>t.id===teamId)?.name || "Kein Bereich";
}
function teamColor(teamId){
  return TEAMS.find(t=>t.id===teamId)?.color || "#8987A1";
}

/* ── Time formatting ─────────────────────────────────────────────────── */
function relTime(ts){
  const diff = (Date.now()-new Date(ts))/1000;
  if(diff < 60) return "Gerade eben";
  if(diff < 3600) return `vor ${Math.floor(diff/60)} Min`;
  if(diff < 86400) return `vor ${Math.floor(diff/3600)} Std`;
  return `vor ${Math.floor(diff/86400)} Tag${Math.floor(diff/86400)>1?"en":""}`;
}
function shortDate(d){
  if(!d) return "";
  return new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"short"});
}

/* ── Priority edge decoration ────────────────────────────────────────── */
function PriEdge({priority}){
  return h("span",{className:`pri-edge ${priority}`});
}

/* ── Notification icon helper ────────────────────────────────────────── */
const NOTIF_IC = {assigned:{n:"user",bg:"#312F80"},comment:{n:"messageCircle",bg:"#3D7AD2"},
  due:{n:"clock",bg:"#E08A2B"},status:{n:"activity",bg:"#54B948"},team:{n:"users",bg:"#5D44E0"},
  share:{n:"share",bg:"#FD5266"},done:{n:"checkCircle",bg:"#54B948"}};

function NotifIcon({type}){
  const ic = NOTIF_IC[type]||{n:"bell",bg:"#312F80"};
  return h("span",{className:"nic",style:{background:ic.bg,color:"#fff",borderRadius:9}},
    h(Icon,{n:ic.n,size:11,strokeWidth:2})
  );
}

/* ── Presence dot helpers ─────────────────────────────────────────────── */
function PresenceDot({status}){
  return h("span",{className:`pres ${status==="online"?"":status==="away"?"away":"off"}`,
    style:{position:"static",width:9,height:9,display:"inline-block",borderRadius:99,flexShrink:0}});
}

/* ── Thin separator line ─────────────────────────────────────────────── */
function Sep(){return h("hr",{className:"divider"})}

/* ── TagDot (team color square) ──────────────────────────────────────── */
function TagDot({color,size=9}){
  return h("span",{className:"tag-dot",style:{background:color,width:size,height:size}});
}

/* ── IconButton ──────────────────────────────────────────────────────── */
function IconBtn({icon, onClick, title, hasDot=false, size=19, cls=""}){
  return h("button",{className:`iconbtn ${cls}`,onClick,title,"aria-label":title},
    h(Icon,{n:icon,size}),
    hasDot && h("span",{className:"dot"})
  );
}

Object.assign(window,{
  Avatar, AvatarStack, StatusChip, PriorityChip, DueChip, PriEdge,
  NotifIcon, PresenceDot, Sep, TagDot, IconBtn,
  ST_LABELS, PRI_LABELS, relTime, shortDate, userName, userRole, teamName, teamColor,
});
})();
