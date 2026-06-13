// dist/chat.js — compiled from app/chat.jsx
(function(){
"use strict";
const{useState:S,useEffect:v,useRef:T,Fragment:FR}=React,h=React.createElement;

function mapMsg(m){return{id:Number(m.id),userId:Number(m.user_id||m.userId),recipientId:m.recipient_id!=null?Number(m.recipient_id):null,userName:m.user_name||m.userName||"",content:m.content||"",attachmentUrl:m.attachment_url||null,attachmentName:m.attachment_name||null,ts:m.created_at||m.ts};}
function fmtTime(ts){if(!ts)return"";return new Date(ts).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});}
function fmtDate(ts){if(!ts)return"";const d=new Date(ts),today=new Date();if(d.toDateString()===today.toDateString())return"Heute";const yest=new Date(today);yest.setDate(yest.getDate()-1);if(d.toDateString()===yest.toDateString())return"Gestern";return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});}
function groupByDate(msgs){const groups=[];let curDate=null;msgs.forEach(m=>{const d=new Date(m.ts).toDateString();if(d!==curDate){groups.push({date:fmtDate(m.ts),messages:[m]});curDate=d;}else groups[groups.length-1].messages.push(m);});return groups;}

function fileIcon(name){
  if(!name)return"📄";
  const ext=(name.split(".").pop()||"").toLowerCase();
  if(["pdf"].includes(ext))return"📕";
  if(["doc","docx"].includes(ext))return"📝";
  if(["xls","xlsx","csv"].includes(ext))return"📊";
  if(["ppt","pptx"].includes(ext))return"📑";
  if(["zip","rar","7z"].includes(ext))return"🗜️";
  if(["jpg","jpeg","png","gif","webp","svg"].includes(ext))return"🖼️";
  if(["mp4","mov","avi","mkv"].includes(ext))return"🎬";
  if(["mp3","m4a","wav"].includes(ext))return"🎵";
  return"📄";
}

function ThreadItem({label,sub,avatarEl,active,unread,onClick}){
  return h("button",{className:"dm-thread"+(active?" active":""),onClick},
    avatarEl,
    h("div",{className:"dm-thread-body"},
      h("div",{className:"dm-thread-name"},label),
      sub&&h("div",{className:"dm-thread-sub"},sub)
    ),
    unread>0&&h("span",{className:"dm-badge"},unread>9?"9+":unread)
  );
}

function ChatAttachment({url,name,isMe}){
  const API=(window.ESG_API&&window.ESG_API.baseUrl&&window.ESG_API.baseUrl())||window.ESG_API_BASE||"http://127.0.0.1:8085";
  const fullUrl=API+url;
  return h("a",{className:"chat-attachment"+(isMe?" me":""),href:fullUrl,target:"_blank",rel:"noopener noreferrer",download:name||true},
    h("span",{className:"chat-att-icon"},fileIcon(name)),
    h("div",{className:"chat-att-body"},
      h("div",{className:"chat-att-name"},name||"Datei"),
      h("div",{className:"chat-att-label"},"Herunterladen")
    ),
    h("span",{className:"chat-att-dl"},"↓")
  );
}

function MessagePane({ME,USERS,threadId,messages,loading,sending,input,setInput,onSend,placeholder,pendingFile,onFileSelect,onClearFile,fileInputRef}){
  const bottomRef=T(null);
  v(()=>{if(bottomRef.current)bottomRef.current.scrollIntoView({behavior:"smooth"});},[messages]);
  const groups=groupByDate(messages);
  return h(FR,null,
    h("div",{className:"chat-messages"},
      loading&&h("div",{className:"chat-empty"},"Wird geladen…"),
      !loading&&messages.length===0&&h("div",{className:"chat-empty"},
        h("div",{style:{fontSize:36}},threadId===null?"💬":"🤝"),
        h("div",{style:{marginTop:8}},threadId===null?"Noch keine Nachrichten im Kollegium.":"Noch keine Direktnachrichten.")
      ),
      groups.map((g,gi)=>h("div",{key:gi},
        h("div",{className:"chat-date-sep"},h("span",null,g.date)),
        g.messages.map(m=>{
          const isMe=m.userId===ME.id;
          const sender=isMe?ME:(USERS&&USERS.find(u=>u.id===m.userId));
          const displayName=isMe?(ME.name||"Ich"):(m.userName||sender?.initials||"?");
          return h("div",{key:m.id,className:"chat-msg"+(isMe?" me":"")},
            !isMe&&h(Avatar,{userId:m.userId,size:"xs"}),
            h("div",{className:"chat-bubble-wrap"},
              h("div",{className:"chat-bubble"},
                m.content&&h("div",{className:"chat-text"},m.content),
                m.attachmentUrl&&h(ChatAttachment,{url:m.attachmentUrl,name:m.attachmentName,isMe}),
                h("div",{className:"chat-ts"},fmtTime(m.ts))
              ),
              h("div",{className:"chat-sender-name"+(isMe?" me":"")},displayName)
            )
          );
        })
      )),
      h("div",{ref:bottomRef})
    ),
    pendingFile&&h("div",{className:"chat-pending-file"},
      h("span",{className:"chat-att-icon"},fileIcon(pendingFile.name)),
      h("span",{className:"chat-pending-name"},pendingFile.name),
      h("button",{className:"chat-pending-rm",onClick:onClearFile,title:"Entfernen"},"×")
    ),
    h("form",{className:"chat-composer",onSubmit:onSend},
      h("input",{type:"file",ref:fileInputRef,style:{display:"none"},onChange:onFileSelect}),
      h("button",{type:"button",className:"iconbtn chat-attach-btn",title:"Datei anhängen",onClick:()=>fileInputRef.current&&fileInputRef.current.click()},
        h(Icon,{n:"paperclip",size:17})
      ),
      h("input",{className:"chat-input",placeholder,value:input,onChange:e=>setInput(e.target.value),disabled:sending,autoComplete:"off"}),
      h("button",{type:"submit",className:"btn btn-primary btn-sm",disabled:(!input.trim()&&!pendingFile)||sending},
        sending?h(Icon,{n:"loader",size:15}):h(Icon,{n:"send",size:15})
      )
    )
  );
}

function ChatView(){
  const{ME,USERS}=window.ESG_DATA;
  const[threadId,setThreadId]=S(null);
  const[threads,setThreads]=S({});
  const[unread,setUnread]=S({});
  const[input,setInput]=S("");
  const[sending,setSending]=S(false);
  const[loading,setLoading]=S(true);
  const[mobilePane,setMobilePane]=S("list");
  const[pendingFile,setPendingFile]=S(null);
  const fileInputRef=T(null);

  const KEY=threadId===null?"group":String(threadId);
  const msgs=threads[KEY]||[];

  v(()=>{
    if(!window.ESG_API.hasSession()){setLoading(false);return;}
    setLoading(true);
    const qs=threadId!==null?"?to="+threadId:"";
    window.ESG_API.fetch("/api/chat"+qs)
      .then(data=>{
        const mapped=(data.messages||[]).map(mapMsg);
        setThreads(prev=>({...prev,[KEY]:mapped}));
        if(threadId!==null)setUnread(prev=>({...prev,[String(threadId)]:0}));
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[threadId]);

  v(()=>{
    function onChat(e){
      const raw=e.detail&&(e.detail.message||e.detail);
      if(!raw||!raw.id)return;
      const m=mapMsg(raw);
      const mKey=m.recipientId===null?"group":(m.userId===ME.id?String(m.recipientId):String(m.userId));
      setThreads(prev=>{
        const arr=prev[mKey]||[];
        if(arr.some(x=>x.id===m.id))return prev;
        return{...prev,[mKey]:[...arr,m]};
      });
      const activeKey=threadId===null?"group":String(threadId);
      if(mKey!==activeKey&&m.userId!==ME.id){
        setUnread(prev=>({...prev,[mKey]:(prev[mKey]||0)+1}));
      }
    }
    window.addEventListener("esg:chat",onChat);
    return()=>window.removeEventListener("esg:chat",onChat);
  },[threadId,ME.id]);

  async function send(e){
    e.preventDefault();
    const text=input.trim();
    if(!text&&!pendingFile)return;
    if(sending)return;
    setSending(true);
    setInput("");
    let attachmentUrl=null,attachmentName=null;
    try{
      if(pendingFile){
        const fd=new FormData();
        fd.append("file",pendingFile);
        const up=await window.ESG_API.uploadFile("/api/chat/upload",fd);
        attachmentUrl=up.url;
        attachmentName=up.name;
        setPendingFile(null);
        if(fileInputRef.current)fileInputRef.current.value="";
      }
      const body={content:text};
      if(threadId!==null)body.to=threadId;
      if(attachmentUrl)body.attachment_url=attachmentUrl;
      if(attachmentName)body.attachment_name=attachmentName;
      const data=await window.ESG_API.fetch("/api/chat",{method:"POST",body:JSON.stringify(body)});
      const m=mapMsg(data.message);
      setThreads(prev=>{
        const arr=prev[KEY]||[];
        return arr.some(x=>x.id===m.id)?prev:{...prev,[KEY]:[...arr,m]};
      });
    }catch(err){
      window._addToast&&window._addToast()({title:"Fehler",body:"Nachricht konnte nicht gesendet werden."});
      setInput(text);
    }finally{setSending(false);}
  }

  function onFileSelect(e){
    const f=e.target.files[0]||null;
    setPendingFile(f);
  }
  function onClearFile(){
    setPendingFile(null);
    if(fileInputRef.current)fileInputRef.current.value="";
  }

  function openThread(id){
    setThreadId(id);
    const k=id===null?"group":String(id);
    setUnread(prev=>({...prev,[k]:0}));
    setMobilePane("messages");
  }

  const colleagues=(USERS||[]).filter(u=>u.id!==ME.id);
  const totalUnread=Object.values(unread).reduce((a,b)=>a+b,0);
  const activeThread=threadId!==null?(USERS||[]).find(u=>u.id===threadId):null;
  const placeholder=threadId===null?"Nachricht ans Kollegium…":"Nachricht an "+(activeThread?.name||"…");

  return h("div",{className:"chat-layout"},
    h("div",{className:"dm-list"+(mobilePane==="messages"?" mobile-hidden":"")},
      h("div",{className:"dm-list-head"},
        h("span",null,"Nachrichten"),
        totalUnread>0&&h("span",{className:"dm-badge dm-badge-total"},totalUnread)
      ),
      h(ThreadItem,{
        label:"Kollegium",sub:"Alle Kolleg:innen",
        avatarEl:h("span",{className:"dm-group-icon"},h(Icon,{n:"users",size:18})),
        active:threadId===null,unread:unread["group"]||0,onClick:()=>openThread(null),
      }),
      h("div",{className:"dm-sep"}),
      h("div",{className:"dm-list-label"},"Direktnachrichten"),
      colleagues.map(u=>h(ThreadItem,{
        key:u.id,label:u.name,sub:u.email||"",
        avatarEl:h(Avatar,{userId:u.id,size:"sm"}),
        active:threadId===u.id,unread:unread[String(u.id)]||0,
        onClick:()=>openThread(u.id),
      }))
    ),
    h("div",{className:"dm-pane"+(mobilePane==="list"?" mobile-hidden":"")},
      h("div",{className:"dm-pane-head"},
        h("button",{className:"dm-back-btn",onClick:()=>setMobilePane("list")},h(Icon,{n:"arrowLeft",size:16})),
        threadId===null
          ?h(FR,null,h("span",{className:"dm-group-icon sm"},h(Icon,{n:"users",size:15})),h("strong",null,"Chat"))
          :h(FR,null,h(Avatar,{userId:threadId,size:"xs"}),h("strong",null,activeThread?.name||""))
      ),
      h(MessagePane,{ME,USERS,threadId,messages:msgs,loading,sending,input,setInput,onSend:send,placeholder,pendingFile,onFileSelect,onClearFile,fileInputRef})
    )
  );
}

window.ChatView=ChatView;
})();
