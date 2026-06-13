// ========================================================================
//  ToDo-Schule — Calendar View (monthly + weekly, remindAt, create from cell)
// ========================================================================
(function(){
const {useState,useMemo} = React;
const {createElement:h,Fragment} = React;
const {TEAMS} = window.ESG_DATA;

const MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAY_NAMES   = ["Mo","Di","Mi","Do","Fr","Sa","So"];

function getWeekNumber(d){
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate()+3-(dt.getDay()+6)%7);
  const w1 = new Date(dt.getFullYear(),0,4);
  return 1+Math.round(((dt-w1)/86400000-3+(w1.getDay()+6)%7)/7);
}

function toYMD(d){ return d.toISOString().slice(0,10); }

function CalendarView({tasks, onOpen, onNewTask}){
  const today    = new Date();
  const todayStr = toYMD(today);

  const [calView, setCalView] = useState("month");
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(()=>{
    const d = new Date(today);
    const dow = (d.getDay()+6)%7;
    d.setDate(d.getDate()-dow);
    return toYMD(d);
  });

  /* ── Month navigation ──────────────────────────────────────────────── */
  function prevMonth(){ if(month===0){ setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }
  function nextMonth(){ if(month===11){ setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }
  function prevWeek(){ const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(toYMD(d)); }
  function nextWeek(){ const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(toYMD(d)); }
  function goToday(){
    setYear(today.getFullYear()); setMonth(today.getMonth());
    const d=new Date(today); d.setDate(d.getDate()-(d.getDay()+6)%7);
    setWeekStart(toYMD(d));
  }

  /* ── Week days ─────────────────────────────────────────────────────── */
  const weekDays = useMemo(()=>{
    const days=[]; const s=new Date(weekStart);
    for(let i=0;i<7;i++){ const d=new Date(s); d.setDate(d.getDate()+i); days.push(toYMD(d)); }
    return days;
  },[weekStart]);

  /* ── Month cells ───────────────────────────────────────────────────── */
  const monthCells = useMemo(()=>{
    const first = new Date(year,month,1);
    const startDow = (first.getDay()+6)%7;
    const dim = new Date(year,month+1,0).getDate();
    const prevDim = new Date(year,month,0).getDate();
    const cells=[];
    for(let i=startDow-1;i>=0;i--){
      const mo=month===0?12:month, yr=month===0?year-1:year;
      cells.push({date:`${yr}-${String(mo).padStart(2,"0")}-${String(prevDim-i).padStart(2,"0")}`,outside:true});
    }
    for(let d=1;d<=dim;d++){
      cells.push({date:`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,outside:false});
    }
    const rem=7-(cells.length%7);
    if(rem<7){
      const nm=month===11?1:month+2, ny=month===11?year+1:year;
      for(let d=1;d<=rem;d++){
        cells.push({date:`${ny}-${String(nm).padStart(2,"0")}-${String(d).padStart(2,"0")}`,outside:true});
      }
    }
    return cells;
  },[year,month]);

  /* ── Tasks by date (due + remindAt) ───────────────────────────────── */
  const tasksByDate = useMemo(()=>{
    const m={};
    tasks.forEach(t=>{
      if(t.due){ (m[t.due]||(m[t.due]=[])).push({...t,_dateType:"due"}); }
      if(t.remindAt){
        const rd=t.remindAt.slice(0,10);
        if(rd!==t.due){ (m[rd]||(m[rd]=[])).push({...t,_dateType:"remind"}); }
      }
    });
    return m;
  },[tasks]);

  /* ── Day cell (month view) ─────────────────────────────────────────── */
  function DayCell({date,outside}){
    const dayTasks = tasksByDate[date]||[];
    const isToday  = date===todayStr;
    return h("div",{
      className:`cal-cell ${outside?"out":""} ${isToday?"today":""}`,
      onClick:()=>onNewTask&&onNewTask(date),
      title:"Aufgabe für diesen Tag anlegen",
    },
      h("div",{className:"cal-dn"},date.split("-")[2]),
      h("div",{className:"cal-chips",onClick:e=>e.stopPropagation()},
        dayTasks.slice(0,3).map((t,idx)=>{
          const team = TEAMS.find(x=>x.id===t.teamId);
          return h("button",{
            key:`${t.id}-${t._dateType}-${idx}`,
            className:`cal-chip ${t.status==="done"?"done":""} ${t._dateType==="remind"?"remind":""}`,
            style:{background:(team?.color||"#6178FE")+"22",color:team?.color||"#6178FE"},
            onClick:e=>{e.stopPropagation();onOpen(t)},
            title:t.title,
          }, t._dateType==="remind" ? "⏰ " : null, t.title);
        }),
        dayTasks.length>3 && h("div",{className:"cal-more"},`+${dayTasks.length-3}`)
      )
    );
  }

  /* ── Week view ─────────────────────────────────────────────────────── */
  function WeekView(){
    return h("div",{className:"cal-week"},
      h("div",{className:"cal-week-head"},
        weekDays.map((date,i)=>{
          const isToday = date===todayStr;
          return h("div",{key:date,className:`cal-week-dayname ${isToday?"today":""}`},
            h("span",{className:"cwd-name"},DAY_NAMES[i]),
            h("span",{className:`cwd-num ${isToday?"today":""}`},date.split("-")[2])
          );
        })
      ),
      h("div",{className:"cal-week-grid"},
        weekDays.map(date=>{
          const dayTasks = tasksByDate[date]||[];
          const isToday  = date===todayStr;
          return h("div",{
            key:date,
            className:`cal-week-col ${isToday?"today":""}`,
            onClick:()=>onNewTask&&onNewTask(date),
          },
            h("div",{className:"cal-chips",onClick:e=>e.stopPropagation()},
              dayTasks.length===0
                ? h("div",{className:"cal-week-empty"},h(Icon,{n:"plus",size:14}))
                : dayTasks.map((t,idx)=>{
                    const team = TEAMS.find(x=>x.id===t.teamId);
                    return h("button",{
                      key:`${t.id}-${idx}`,
                      className:`cal-chip ${t.status==="done"?"done":""} ${t._dateType==="remind"?"remind":""}`,
                      style:{background:(team?.color||"#6178FE")+"22",color:team?.color||"#6178FE"},
                      onClick:e=>{e.stopPropagation();onOpen(t)},
                      title:t.title,
                    }, t._dateType==="remind" ? "⏰ " : null, t.title);
                  })
            )
          );
        })
      )
    );
  }

  const headerLabel = calView==="month"
    ? `${MONTH_NAMES[month]} ${year}`
    : `KW ${getWeekNumber(new Date(weekStart))} · ${MONTH_NAMES[new Date(weekStart).getMonth()]} ${new Date(weekStart).getFullYear()}`;

  return h("div",{className:"cal"},
    h("div",{className:"cal-head"},
      h("button",{className:"btn btn-ghost btn-sm",onClick:calView==="month"?prevMonth:prevWeek},
        h(Icon,{n:"chevronLeft",size:16})
      ),
      h("h2",{className:"cal-title"},headerLabel),
      h("button",{className:"btn btn-ghost btn-sm",onClick:calView==="month"?nextMonth:nextWeek},
        h(Icon,{n:"chevronRight",size:16})
      ),
      h("div",{className:"sp"}),
      h("button",{className:"btn btn-ghost btn-sm",onClick:goToday},"Heute"),
      h("div",{className:"seg cal-view-seg"},
        h("button",{className:calView==="month"?"on":"",onClick:()=>setCalView("month")},"Monat"),
        h("button",{className:calView==="week"?"on":"",onClick:()=>setCalView("week")},"Woche")
      )
    ),
    calView==="month" && h(Fragment,null,
      h("div",{className:"cal-grid cal-days"},
        DAY_NAMES.map(d=>h("div",{key:d,className:"cal-dayname"},d))
      ),
      h("div",{className:"cal-grid"},
        monthCells.map(({date,outside})=>h(DayCell,{key:date,date,outside}))
      )
    ),
    calView==="week" && h(WeekView,null)
  );
}

Object.assign(window,{CalendarView});
})();
