// ========================================================================
//  ToDo-Schule — Task Detail Drawer (Premium)
// ========================================================================
(function(){
const {useState,useEffect,useRef,useCallback} = React;
const {createElement:h,Fragment} = React;
const {USERS, ME, TEAMS} = window.ESG_DATA;
const ST_LABELS  = window.ST_LABELS;
const PRI_LABELS = window.PRI_LABELS;

/* ── File type icon + color ──────────────────────────────────────────── */
const EXT_META = {
  pdf:  {label:"PDF",  color:"#E84747",bg:"#fde8e8"},
  doc:  {label:"DOC",  color:"#1A73E8",bg:"#e8f0fe"},
  docx: {label:"DOCX", color:"#1A73E8",bg:"#e8f0fe"},
  ppt:  {label:"PPT",  color:"#FF6D00",bg:"#fff0e0"},
  pptx: {label:"PPTX", color:"#FF6D00",bg:"#fff0e0"},
  xls:  {label:"XLS",  color:"#1E7E34",bg:"#e6f4ea"},
  xlsx: {label:"XLSX", color:"#1E7E34",bg:"#e6f4ea"},
  txt:  {label:"TXT",  color:"#8987A1",bg:"#f0effe"},
  csv:  {label:"CSV",  color:"#54B948",bg:"#e9fbe8"},
  mp3:  {label:"MP3",  color:"#FF5C8D",bg:"#ffe8ef"},
  mp4:  {label:"MP4",  color:"#5D44E0",bg:"#ede8ff"},
  wav:  {label:"WAV",  color:"#5D44E0",bg:"#ede8ff"},
  ogg:  {label:"OGG",  color:"#5D44E0",bg:"#ede8ff"},
  avi:  {label:"AVI",  color:"#5D44E0",bg:"#ede8ff"},
  mov:  {label:"MOV",  color:"#5D44E0",bg:"#ede8ff"},
  png:  {label:"PNG",  color:"#3D7AD2",bg:"#e8f0fe"},
  jpg:  {label:"JPG",  color:"#3D7AD2",bg:"#e8f0fe"},
  jpeg: {label:"JPG",  color:"#3D7AD2",bg:"#e8f0fe"},
  gif:  {label:"GIF",  color:"#3D7AD2",bg:"#e8f0fe"},
  webp: {label:"WEBP", color:"#3D7AD2",bg:"#e8f0fe"},
  svg:  {label:"SVG",  color:"#3D7AD2",bg:"#e8f0fe"},
  zip:  {label:"ZIP",  color:"#E08A2B",bg:"#fef3e2"},
  rar:  {label:"RAR",  color:"#E08A2B",bg:"#fef3e2"},
};

function fileExt(name){ return (name||"").split(".").pop().toLowerCase(); }
function fileMeta(name){ return EXT_META[fileExt(name)] || {label:fileExt(name).toUpperCase()||"?",color:"#8987A1",bg:"#f0effe"}; }
function fileSize(bytes){
  if(!bytes) return "";
  if(bytes<1024) return `${bytes} B`;
  if(bytes<1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}

/* ── Picker popup ────────────────────────────────────────────────────── */
function PickerPopup({items, selected, onToggle, onClose}){
  const ref = useRef();
  useEffect(()=>{
    function h2(e){ if(ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown",h2);
    return ()=>document.removeEventListener("mousedown",h2);
  },[]);
  return h("div",{ref,className:"pick"},
    items.map(it => h("div",{key:it.id,className:`pick-item ${selected.includes(it.id)?"on":""}`,onClick:()=>onToggle(it.id)},
      it.av ? h(Avatar,{userId:it.id,size:"xs"}) : h("span",{style:{width:11,height:11,borderRadius:99,background:it.color,display:"inline-block",flexShrink:0}}),
      h("span",{className:"grow"},it.label),
      selected.includes(it.id) && h(Icon,{n:"check",size:14,className:"ck"})
    ))
  );
}

/* ── Attachment item ─────────────────────────────────────────────────── */
function AttachmentItem({att, taskId, onDelete}){
  const [loading, setLoading] = useState(false);
  const meta = fileMeta(att.originalName);
  const canPreview = att.mimeType && (att.mimeType.startsWith("image/") || att.mimeType==="application/pdf");

  async function handleDownload(e){
    e.stopPropagation();
    setLoading(true);
    try{
      await window.ESG_API.downloadAttachment(taskId, att.id, att.originalName);
    }catch(err){ console.warn("Download fehlgeschlagen:", err); }
    finally{ setLoading(false); }
  }

  function handleDelete(e){
    e.stopPropagation();
    if(!window.confirm(`„${att.originalName}" wirklich löschen?`)) return;
    onDelete(att.id);
  }

  return h("div",{className:"att-item"},
    h("div",{className:"att-icon",style:{background:meta.bg,color:meta.color}},
      h("span",null,meta.label)
    ),
    h("div",{className:"att-info"},
      h("div",{className:"att-name",title:att.originalName},att.originalName),
      h("div",{className:"att-meta"},
        fileSize(att.size),
        att.uploaderName && h(Fragment,null," · ",att.uploaderName)
      )
    ),
    h("div",{className:"att-actions"},
      h("button",{className:"iconbtn btn-sm",onClick:handleDownload,disabled:loading,title:"Herunterladen"},
        h(Icon,{n:loading?"clock":"download",size:15})
      ),
      att.uploadedBy===ME.id && h("button",{className:"iconbtn btn-sm",onClick:handleDelete,title:"Löschen",style:{color:"var(--st-high,#c44)"}},
        h(Icon,{n:"trash",size:15})
      )
    )
  );
}

/* ── Main Drawer ──────────────────────────────────────────────────────── */
function TaskDrawer({task, onClose, onToggleDone, onShare, onSave, onDelete}){
  const [localTask, setLocalTask] = useState({...task});
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState("comments");
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingC, setLoadingC] = useState(true);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [picker, setPicker]     = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef();
  const taRef        = useRef();
  const hasAPI       = window.ESG_API.hasSession();

  /* Load comments on mount */
  useEffect(()=>{
    if(!hasAPI){ setComments(window.ESG_DATA.COMMENTS[task.id]||[]); setLoadingC(false); return; }
    window.ESG_API.getComments(task.id)
      .then(c=>setComments(c))
      .catch(()=>setComments(window.ESG_DATA.COMMENTS[task.id]||[]))
      .finally(()=>setLoadingC(false));
  },[]);

  /* Load attachments on mount */
  useEffect(()=>{
    if(!hasAPI){ setLoadingAtt(false); return; }
    window.ESG_API.getAttachments(task.id)
      .then(a=>setAttachments(a))
      .catch(()=>{})
      .finally(()=>setLoadingAtt(false));
  },[]);

  /* Load activity when tab switches */
  useEffect(()=>{
    if(tab!=="activity") return;
    if(activity.length>0 || !hasAPI) return;
    setLoadingA(true);
    window.ESG_API.getAudit(task.id)
      .then(r=>setActivity(r.logs||r.audit||[]))
      .catch(()=>setActivity(window.ESG_DATA.ACTIVITY[task.id]||[]))
      .finally(()=>setLoadingA(false));
  },[tab]);

  function update(k,v){
    setLocalTask(prev=>({...prev,[k]:v}));
    setDirty(true);
  }

  async function handleSave(){
    if(!dirty) return;
    setSaving(true);
    try{
      if(onSave) await onSave(localTask);
      setDirty(false);
    }finally{ setSaving(false); }
  }

  async function sendComment(){
    if(!commentText.trim()) return;
    const nc = {id:Date.now(),user:ME.id,text:commentText,ts:new Date().toISOString(),userName:ME.name};
    setComments(prev=>[...prev,nc]);
    const txt = commentText;
    setCommentText("");
    if(hasAPI){
      try{
        const saved = await window.ESG_API.addComment(task.id, txt);
        setComments(prev=>prev.map(c=>c.id===nc.id?saved:c));
      }catch(err){ setComments(prev=>prev.filter(c=>c.id!==nc.id)); setCommentText(txt); }
    }
  }

  async function deleteComment(id){
    setComments(prev=>prev.filter(c=>c.id!==id));
    if(hasAPI) await window.ESG_API.deleteComment(task.id, id).catch(()=>{});
  }

  async function handleFileInput(e){
    const file = e.target.files[0];
    if(!file) return;
    setUploadingFile(true);
    try{
      const att = await window.ESG_API.uploadAttachment(task.id, file);
      setAttachments(prev=>[...prev,att]);
    }catch(err){ window._addToast()({title:"Upload fehlgeschlagen",body:err.error||err.message}); }
    finally{ setUploadingFile(false); e.target.value=""; }
  }

  async function deleteAtt(attId){
    const att = attachments.find(a=>a.id===attId);
    setAttachments(prev=>prev.filter(a=>a.id!==attId));
    if(hasAPI) await window.ESG_API.deleteAttachment(task.id, attId).catch(()=>{
      if(att) setAttachments(prev=>[att,...prev]);
    });
  }

  const team = TEAMS.find(t=>t.id===localTask.teamId);

  const ALLOWED_ACCEPT = [
    ".pdf",".doc",".docx",".ppt",".pptx",".xls",".xlsx",
    ".txt",".csv",".mp3",".mp4",".wav",".ogg",".avi",".mov",".webm",
    ".png",".jpg",".jpeg",".gif",".webp",".svg",".zip",".rar",".7z"
  ].join(",");

  return h(Fragment,null,
    h("div",{className:"scrim",onClick:onClose}),
    h("div",{className:"drawer","aria-modal":"true",role:"dialog"},

      /* HEAD */
      h("div",{className:"drawer-head"},
        h("button",{className:"btn btn-ghost btn-sm",onClick:onClose},
          h(Icon,{n:"chevronRight",size:16}),"Schließen"
        ),
        h("div",{className:"sp"}),
        dirty && h("button",{
          className:`btn btn-primary btn-sm ${saving?"":""}`,
          onClick:handleSave, disabled:saving
        }, saving?h(Icon,{n:"clock",size:14}):h(Icon,{n:"check",size:14}), saving?"Speichern…":"Speichern"),
        h("button",{className:"btn btn-soft btn-sm",onClick:onShare},
          h(Icon,{n:"share",size:15}),"Teilen"
        ),
        h("div",{style:{position:"relative"}},
          h("button",{className:"iconbtn btn-sm",title:"Aufgabe löschen",
            style:{color:"var(--st-high,#c44)"},
            onClick:()=>{ if(window.confirm(`„${localTask.title}" wirklich löschen?`)) onDelete&&onDelete(task.id); }
          }, h(Icon,{n:"trash",size:16}))
        )
      ),

      /* BODY */
      h("div",{className:"drawer-body"},

        /* Title */
        h("div",{className:"dr-title-row"},
          h("button",{
            className:`check ${localTask.status==="done"?"on":""}`,
            onClick:()=>{ update("status", localTask.status==="done"?"todo":"done"); onToggleDone(task.id); },
            "aria-label":"Status"
          }, h(Icon,{n:"check",size:14,strokeWidth:2.5})),
          h("textarea",{
            className:`dr-title ${localTask.status==="done"?"done":""}`,
            value:localTask.title, rows:2,
            onChange:e=>update("title",e.target.value)
          })
        ),

        /* Properties */
        h("div",{className:"dr-props"},
          /* Status */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"activity",size:15}),"Status"),
            h("div",{className:"v",style:{position:"relative"}},
              h("button",{className:"propbtn",onClick:()=>setPicker(picker==="status"?null:"status")},
                h(StatusChip,{status:localTask.status})
              ),
              picker==="status" && h(PickerPopup,{
                items:[{id:"todo",label:ST_LABELS.todo,color:"var(--st-todo)"},{id:"in_progress",label:ST_LABELS.in_progress,color:"var(--st-prog)"},{id:"done",label:ST_LABELS.done,color:"var(--st-done)"}],
                selected:[localTask.status],
                onToggle:v=>{ update("status",v); setPicker(null); },
                onClose:()=>setPicker(null)
              })
            )
          ),
          /* Priority */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"flag",size:15}),"Priorität"),
            h("div",{className:"v",style:{position:"relative"}},
              h("button",{className:"propbtn",onClick:()=>setPicker(picker==="priority"?null:"priority")},
                h(PriorityChip,{priority:localTask.priority})
              ),
              picker==="priority" && h(PickerPopup,{
                items:[{id:"high",label:PRI_LABELS.high,color:"var(--pri-high)"},{id:"medium",label:PRI_LABELS.medium,color:"var(--pri-med)"},{id:"low",label:PRI_LABELS.low,color:"var(--pri-low)"}],
                selected:[localTask.priority],
                onToggle:v=>{ update("priority",v); setPicker(null); },
                onClose:()=>setPicker(null)
              })
            )
          ),
          /* Due date */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"calendar",size:15}),"Fällig am"),
            h("div",{className:"v"},
              h("input",{type:"date",className:"input btn-sm",style:{width:"auto"},
                value:localTask.due||"",onChange:e=>update("due",e.target.value||null)})
            )
          ),
          /* Remind at */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"bellRing",size:15}),"Erinnerung"),
            h("div",{className:"v"},
              h("input",{type:"datetime-local",className:"input btn-sm",style:{width:"auto"},
                value:localTask.remindAt||"",onChange:e=>update("remindAt",e.target.value||null)})
            )
          ),
          /* Wiederholung (recurrence) */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"clock",size:15}),"Wiederholung"),
            h("div",{className:"v"},
              h("select",{className:"input btn-sm",style:{width:"auto"},
                value:localTask.recurrence||"none",onChange:e=>update("recurrence",e.target.value)},
                h("option",{value:"none"},"Keine"),
                h("option",{value:"daily"},"Täglich"),
                h("option",{value:"weekly"},"Wöchentlich"),
                h("option",{value:"monthly"},"Monatlich"))
            )
          ),
          /* Bereich (editable) */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"users",size:15}),"Bereich"),
            h("div",{className:"v"},
              h("select",{className:"input btn-sm",style:{width:"auto"},
                value:localTask.teamId||"",
                onChange:e=>update("teamId",e.target.value?Number(e.target.value):null)},
                h("option",{value:""},"Kein Bereich"),
                window.ESG_DATA.TEAMS.filter(t=>t.id!==0).map(t=>h("option",{key:t.id,value:t.id},`${t.icon} ${t.name}`))
              )
            )
          ),
          /* Assignees */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"user",size:15}),"Zugewiesen"),
            h("div",{className:"v",style:{position:"relative"}},
              localTask.assignees.length>0 && h(AvatarStack,{userIds:localTask.assignees,size:"sm"}),
              h("button",{
                className:`propbtn ${localTask.assignees.length===0?"placeholder":""}`,
                onClick:()=>setPicker(picker==="assignees"?null:"assignees")
              }, h(Icon,{n:"plus",size:14}), localTask.assignees.length===0?"Zuweisen":""),
              picker==="assignees" && h(PickerPopup,{
                items:USERS.map(u=>({id:u.id,label:u.name,av:true})),
                selected:localTask.assignees,
                onToggle:id=>update("assignees",
                  localTask.assignees.includes(id)
                    ? localTask.assignees.filter(x=>x!==id)
                    : [...localTask.assignees,id]
                ),
                onClose:()=>setPicker(null)
              })
            )
          ),
          /* Tags */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"tag",size:15}),"Tags"),
            h("div",{className:"v tags-v"},
              (localTask.tags||[]).map(tag=>
                h("span",{key:tag,className:"chip chip-tag"},
                  tag,
                  h("button",{className:"tag-rm",onClick:()=>update("tags",(localTask.tags||[]).filter(t=>t!==tag))},"×")
                )
              ),
              h("input",{className:"tag-input input btn-sm",placeholder:"Tag + Enter",
                style:{width:100,height:26},
                onKeyDown:e=>{
                  if(e.key==="Enter"&&e.target.value.trim()){
                    e.preventDefault();
                    const t=e.target.value.trim().toLowerCase();
                    if(!(localTask.tags||[]).includes(t)) update("tags",[...(localTask.tags||[]),t]);
                    e.target.value="";
                  }
                }
              })
            )
          ),

          /* Created by */
          h("div",{className:"dr-prop"},
            h("div",{className:"k"},h(Icon,{n:"sparkle",size:15}),"Erstellt von"),
            h("div",{className:"v"},
              h(Avatar,{userId:localTask.createdBy,size:"xs"}),
              h("span",{style:{fontSize:13.5,color:"var(--text-2)",marginLeft:6}},userName(localTask.createdBy)),
              h("span",{style:{fontSize:12,color:"var(--text-3)",marginLeft:6}},relTime(localTask.createdAt))
            )
          )
        ),

        /* Subtasks / Checklist */
        h("div",{className:"dr-section-h"},
          h("div",{className:"ln"}),
          h("span",null,"Unteraufgaben",
            (localTask.subtasks||[]).length>0 && h("span",{className:"att-count"},
              `${(localTask.subtasks||[]).filter(s=>s.done).length}/${(localTask.subtasks||[]).length}`
            )
          ),
          h("div",{className:"ln"})
        ),
        h("div",{className:"subtask-list"},
          (localTask.subtasks||[]).map((sub,i)=>
            h("div",{key:sub.id||i,className:`subtask-item ${sub.done?"done":""}`},
              h("button",{className:`check ${sub.done?"on":""}`,
                onClick:()=>{
                  const next=[...(localTask.subtasks||[])];
                  next[i]={...sub,done:!sub.done};
                  update("subtasks",next);
                }},h(Icon,{n:"check",size:11,strokeWidth:2.5})
              ),
              h("span",{className:"grow",style:{fontSize:13.5,color:"var(--text)"}},sub.text),
              h("button",{className:"iconbtn btn-sm",style:{width:22,height:22,color:"var(--text-3)"},
                onClick:()=>update("subtasks",(localTask.subtasks||[]).filter((_,j)=>j!==i))},
                h(Icon,{n:"x",size:12})
              )
            )
          ),
          h("div",{className:"subtask-add"},
            h("input",{className:"subtask-input",placeholder:"Unteraufgabe hinzufügen… (Enter)",
              onKeyDown:e=>{
                if(e.key==="Enter"&&e.target.value.trim()){
                  update("subtasks",[...(localTask.subtasks||[]),{id:Date.now(),text:e.target.value.trim(),done:false}]);
                  e.target.value="";
                }
              }
            })
          )
        ),

        /* Description (always editable) */
        h("div",{className:"dr-section-h"},h("div",{className:"ln"}),h("span",null,"Beschreibung"),h("div",{className:"ln"})),
        h("textarea",{
          className:"dr-desc-edit",
          rows:3,
          placeholder:"Beschreibung hinzufügen… (optional)",
          value:localTask.desc||"",
          onChange:e=>update("desc",e.target.value),
          onKeyDown:e=>{ if((e.metaKey||e.ctrlKey)&&e.key==="s"){ e.preventDefault(); handleSave(); } }
        }),

        /* Attachments */
        h("div",{className:"dr-section-h"},
          h("div",{className:"ln"}),
          h("span",null,"Anhänge",attachments.length>0&&h("span",{className:"att-count"},attachments.length)),
          h("div",{className:"ln"}),
          hasAPI && h("button",{
            className:"btn btn-ghost btn-sm",
            onClick:()=>fileInputRef.current?.click(),
            disabled:uploadingFile
          }, h(Icon,{n:"paperclip",size:14}), uploadingFile?"Hochladen…":"Datei")
        ),
        h("input",{ref:fileInputRef,type:"file",style:{display:"none"},accept:ALLOWED_ACCEPT,onChange:handleFileInput}),
        !loadingAtt && attachments.length>0 && h("div",{className:"att-list"},
          attachments.map(a=>h(AttachmentItem,{key:a.id,att:a,taskId:task.id,onDelete:deleteAtt}))
        ),
        loadingAtt && h("div",{className:"skel-line",style:{height:40,margin:"6px 0"}}),

        /* Tabs: Kommentare | Aktivität */
        h("div",{className:"dr-section-h"},
          h("div",{className:"ln"}),
          h("div",{className:"row gap-8"},
            ["comments","activity"].map(t2=>
              h("button",{key:t2,className:`btn btn-ghost btn-sm ${tab===t2?"btn-soft":""}`,onClick:()=>setTab(t2)},
                t2==="comments"
                  ? h(Fragment,null,h(Icon,{n:"messageCircle",size:14}),"Kommentare",comments.length>0&&h("span",{className:"att-count"},comments.length))
                  : h(Fragment,null,h(Icon,{n:"activity",size:14}),"Verlauf")
              )
            )
          ),
          h("div",{className:"ln"})
        ),

        /* Comments */
        tab==="comments" && h("div",{className:"stream"},
          loadingC
            ? [1,2].map(i=>h("div",{key:i,className:"skel-comment"}))
            : comments.length===0
              ? h("div",{style:{padding:"14px 0",color:"var(--text-3)",fontSize:13.5}},"Noch keine Kommentare.")
              : comments.map(c=>h("div",{key:c.id,className:"cmt-item"},
                  h(Avatar,{userId:c.user,size:"sm"}),
                  h("div",{className:"body"},
                    h("div",{className:"hd"},
                      h("span",{className:"nm"},c.userName||userName(c.user)),
                      h("span",{className:"tm"},relTime(c.ts)),
                      c.user===ME.id && h("button",{
                        className:"iconbtn btn-sm",
                        style:{marginLeft:"auto",color:"var(--text-3)",width:24,height:24},
                        onClick:()=>deleteComment(c.id),
                        title:"Löschen"
                      }, h(Icon,{n:"trash",size:12}))
                    ),
                    h("div",{className:"txt"},
                      c.text.split(/(@\w[\w\s]+\w)/).map((part,i)=>
                        part.startsWith("@") ? h("span",{key:i,className:"men"},part) : part
                      )
                    )
                  )
                ))
        ),

        /* Activity */
        tab==="activity" && h("div",{className:"stream"},
          loadingA
            ? [1,2,3].map(i=>h("div",{key:i,className:"skel-line",style:{height:32,marginBottom:8}}))
            : activity.length===0
              ? h("div",{style:{padding:"14px 0",color:"var(--text-3)",fontSize:13.5}},"Keine Aktivitäten aufgezeichnet.")
              : [...activity].reverse().map((a,i)=>h("div",{key:a.id||i,className:"act"},
                  h("div",{className:"ic"},h(Icon,{n:a.action?.includes("comment")?"messageCircle":a.action?.includes("assign")?"user":"activity",size:13})),
                  h("div",null,
                    h("b",null,a.user_name||userName(a.user_id))," ",a.action,
                    a.changes && h("span",{style:{fontSize:12,color:"var(--text-3)"}}," · ",JSON.stringify(a.changes).slice(0,60)),
                    h("div",{className:"tm"},relTime(a.created_at||a.ts))
                  )
                ))
        )
      ),

      /* FOOTER — comment composer */
      h("div",{className:"drawer-foot"},
        h("div",{className:"composer"},
          h(Avatar,{userId:ME.id,size:"sm"}),
          h("textarea",{
            ref:taRef, className:"ta", rows:1,
            placeholder:"Kommentar schreiben… (@Name zum Erwähnen)",
            value:commentText, onChange:e=>setCommentText(e.target.value),
            onKeyDown:e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendComment(); } }
          }),
          h("button",{className:"send",onClick:sendComment,disabled:!commentText.trim(),"aria-label":"Senden"},
            h(Icon,{n:"send",size:16,strokeWidth:2})
          )
        )
      )
    )
  );
}

Object.assign(window,{TaskDrawer});
})();
