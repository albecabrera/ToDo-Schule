// app/chat.jsx — ToDo-Schule Chat (Quelle; dist/chat.js ist die Laufzeit, synchron halten)
// Kollegium + Direktnachrichten · Datei-Upload · Edit/Delete
// Typing-Indicator · Lesebestätigung (DM) · Emoji-Reaktionen
(function(){
"use strict";
const{useState:S,useEffect:v,useRef:T,Fragment:FR}=React,h=React.createElement;

const QUICK_EMOJIS=["👍","❤️","✅","😂","🎉","👏"];

function mapMsg(m){return{id:Number(m.id),userId:Number(m.user_id||m.userId),recipientId:m.recipient_id!=null?Number(m.recipient_id):null,userName:m.user_name||m.userName||"",content:m.content||"",attachmentUrl:m.attachment_url||null,attachmentName:m.attachment_name||null,ts:m.created_at||m.ts,reactions:(m.reactions||[]).map(r=>({emoji:r.emoji,userId:Number(r.user_id||r.userId),userName:r.user_name||r.userName||""})),replyTo:(m.reply_to_id||m.replyTo)?{id:Number(m.reply_to_id||(m.replyTo&&m.replyTo.id)),userName:m.reply_user_name||(m.replyTo&&m.replyTo.userName)||"",content:m.reply_content||(m.replyTo&&m.replyTo.content)||"",attachmentName:m.reply_attachment_name||(m.replyTo&&m.replyTo.attachmentName)||null}:null,pinned:!!(m.pinned&&Number(m.pinned))};}
// Suchtreffer im Text hervorheben.
function highlightText(content,query){
  if(!content||!query)return content;
  const re=new RegExp("("+escapeRe(query)+")","gi");
  const out=[];let last=0,m,key=0;
  while((m=re.exec(content))!==null){
    if(m.index>last)out.push(content.slice(last,m.index));
    out.push(h("mark",{key:key++,className:"chat-hl"},m[0]));
    last=m.index+m[0].length;
    if(re.lastIndex===m.index)re.lastIndex++;
  }
  if(last<content.length)out.push(content.slice(last));
  return out.length?out:content;
}
function replyPreview(r){if(!r)return"";return r.content||(r.attachmentName?(isAudioFile(r.attachmentName)?"🎤 Sprachnachricht":"📎 "+r.attachmentName):"");}
function fmtTime(ts){if(!ts)return"";return new Date(ts).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});}
function lastSeenLabel(ts){
  if(!ts)return"";
  const d=new Date((ts+"").replace(" ","T")+(/(Z|[+\-]\d\d:?\d\d)$/.test(ts)?"":"Z"));
  const sec=(Date.now()-d.getTime())/1000;
  if(sec<120)return"gerade aktiv";
  if(sec<3600)return"zuletzt aktiv vor "+Math.floor(sec/60)+" Min";
  if(sec<86400)return"zuletzt aktiv vor "+Math.floor(sec/3600)+" Std";
  return"zuletzt aktiv am "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
}
function fmtDate(ts){if(!ts)return"";const d=new Date(ts),today=new Date();if(d.toDateString()===today.toDateString())return"Heute";const yest=new Date(today);yest.setDate(yest.getDate()-1);if(d.toDateString()===yest.toDateString())return"Gestern";return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});}
function groupByDate(msgs){const groups=[];let curDate=null;msgs.forEach(m=>{const d=new Date(m.ts).toDateString();if(d!==curDate){groups.push({date:fmtDate(m.ts),messages:[m]});curDate=d;}else groups[groups.length-1].messages.push(m);});return groups;}
// Reaktionen nach Emoji bündeln → [{emoji,count,mine,names}]
function groupReactions(reactions,meId){const map={};(reactions||[]).forEach(r=>{(map[r.emoji]||(map[r.emoji]={emoji:r.emoji,count:0,mine:false,names:[]})).count++;if(r.userId===meId)map[r.emoji].mine=true;map[r.emoji].names.push(r.userName||"?");});return Object.values(map);}
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
// Erwähnungen (@Name) im Text hervorheben.
function renderMentions(content,names,meName){
  if(!content||!names||!names.length)return content;
  const sorted=[...names].sort((a,b)=>b.length-a.length);
  const re=new RegExp("@("+sorted.map(escapeRe).join("|")+")","g");
  const out=[];let last=0,m,key=0;
  while((m=re.exec(content))!==null){
    if(m.index>last)out.push(content.slice(last,m.index));
    const self=meName&&m[1]===meName;
    out.push(h("span",{key:key++,className:"chat-mention"+(self?" me":"")},"@"+m[1]));
    last=m.index+m[0].length;
  }
  if(last<content.length)out.push(content.slice(last));
  return out.length?out:content;
}

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

function isAudioFile(name){const e=(name||"").split(".").pop().toLowerCase();return["webm","ogg","opus","mp3","m4a","wav","aac"].includes(e);}
function ChatAttachment({url,name,isMe}){
  const API=(window.ESG_API&&window.ESG_API.baseUrl&&window.ESG_API.baseUrl())||window.ESG_API_BASE||"http://127.0.0.1:8085";
  const fullUrl=API+url;
  // Sprachnachricht / Audio → eingebetteter Player
  if(isAudioFile(name)){
    return h("div",{className:"chat-voice"+(isMe?" me":"")},
      h("span",{className:"chat-voice-icon"},"🎤"),
      h("audio",{className:"chat-voice-audio",controls:true,preload:"metadata",src:fullUrl})
    );
  }
  return h("a",{className:"chat-attachment"+(isMe?" me":""),href:fullUrl,target:"_blank",rel:"noopener noreferrer",download:name||true},
    h("span",{className:"chat-att-icon"},fileIcon(name)),
    h("div",{className:"chat-att-body"},
      h("div",{className:"chat-att-name"},name||"Datei"),
      h("div",{className:"chat-att-label"},"Herunterladen")
    ),
    h("span",{className:"chat-att-dl"},"↓")
  );
}

function MessagePane({ME,USERS,threadId,messages,loading,sending,input,setInput,onSend,placeholder,pendingFile,onFileSelect,onClearFile,fileInputRef,onEditMsg,onDeleteMsg,onReact,readUpTo,typingName,onSendVoice,onReply,replyTarget,onCancelReply,query,onPin,groupReaders}){
  const bottomRef=T(null);
  const[editingId,setEditingId]=S(null);
  const[editText,setEditText]=S("");
  const[pickerId,setPickerId]=S(null); // Nachricht, deren Emoji-Picker offen ist
  const[recording,setRecording]=S(false);
  const[recSecs,setRecSecs]=S(0);
  const recRef=T(null),chunksRef=T([]),streamRef=T(null),recTimer=T(null),sendOnStop=T(false);
  v(()=>{if(bottomRef.current)bottomRef.current.scrollIntoView({behavior:"smooth"});},[messages,typingName]);

  async function startRec(){
    if(!navigator.mediaDevices||!window.MediaRecorder){
      window._addToast&&window._addToast()({title:"Nicht unterstützt",body:"Sprachaufnahme braucht HTTPS und einen aktuellen Browser."});
      return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;chunksRef.current=[];sendOnStop.current=false;
      const mime=MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":"";
      const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      rec.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
      rec.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        clearInterval(recTimer.current);
        const blob=new Blob(chunksRef.current,{type:chunksRef.current[0]?.type||"audio/webm"});
        const send=sendOnStop.current;
        setRecording(false);setRecSecs(0);
        if(send&&blob.size>0){
          const ext=(blob.type.split("/")[1]||"webm").split(";")[0];
          const file=new File([blob],"Sprachnachricht-"+Date.now()+"."+ext,{type:blob.type});
          onSendVoice(file);
        }
      };
      recRef.current=rec;rec.start();
      setRecording(true);setRecSecs(0);
      recTimer.current=setInterval(()=>setRecSecs(s=>s+1),1000);
    }catch(err){
      window._addToast&&window._addToast()({title:"Kein Mikrofon",body:"Zugriff auf das Mikrofon wurde verweigert."});
    }
  }
  function stopRec(send){
    sendOnStop.current=send;
    if(recRef.current&&recRef.current.state!=="inactive")recRef.current.stop();
  }
  v(()=>()=>{if(recRef.current&&recRef.current.state!=="inactive")recRef.current.stop();clearInterval(recTimer.current);},[]);
  const recMMSS=(n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"))(recSecs);

  // @Erwähnungen: Autovervollständigung
  const composerRef=T(null);
  const colleagues=(USERS||[]).filter(u=>u.id!==ME.id);
  const colleagueNames=colleagues.map(u=>u.name);
  const mq=(input||"").match(/@([\p{L}\p{N}_\-]*)$/u);
  const mentionQuery=mq?mq[1].toLowerCase():null;
  const mentionMatches=mentionQuery!==null
    ?colleagues.filter(u=>{const n=(u.name||"").toLowerCase(),f=n.split(" ")[0];return mentionQuery===""||n.startsWith(mentionQuery)||f.startsWith(mentionQuery)||n.includes(mentionQuery);}).slice(0,5)
    :[];
  function pickMention(u){
    const next=(input||"").replace(/@[\p{L}\p{N}_\-]*$/u,"@"+u.name+" ");
    setInput(next);
    if(composerRef.current)composerRef.current.focus();
  }
  function startEdit(m){setEditingId(m.id);setEditText(m.content||"");}
  function cancelEdit(){setEditingId(null);setEditText("");}
  async function saveEdit(m){
    const t=editText.trim();
    if(!t||t===m.content){cancelEdit();return;}
    await onEditMsg(m,t);
    cancelEdit();
  }
  const q=(query||"").trim().toLowerCase();
  const shown=q?messages.filter(m=>(m.content||"").toLowerCase().includes(q)):messages;
  const pinned=messages.filter(m=>m.pinned);
  const groups=groupByDate(shown);
  return h(FR,null,
    pinned.length>0&&!q&&h("div",{className:"chat-pinned-bar"},
      pinned.slice(-3).map(m=>h("div",{key:m.id,className:"chat-pinned-item"},
        h(Icon,{n:"pin",size:12}),
        h("span",{className:"chat-pinned-name"},(m.userId===ME.id?"Du":(m.userName||"?"))+":"),
        h("span",{className:"chat-pinned-text"},m.content||replyPreview({attachmentName:m.attachmentName})||"Nachricht"),
        h("button",{className:"chat-pinned-rm",title:"Lösen",onClick:()=>onPin(m)},"×")
      ))
    ),
    h("div",{className:"chat-messages"},
      loading&&h("div",{className:"chat-empty"},"Wird geladen…"),
      !loading&&messages.length===0&&h("div",{className:"chat-empty"},
        h("div",{style:{fontSize:36}},threadId===null?"💬":"🤝"),
        h("div",{style:{marginTop:8}},threadId===null?"Noch keine Nachrichten im Kollegium.":"Noch keine Direktnachrichten.")
      ),
      !loading&&q&&shown.length===0&&h("div",{className:"chat-empty"},
        h("div",{style:{fontSize:30}},"🔍"),h("div",{style:{marginTop:8}},"Keine Treffer für „"+query.trim()+"“.")
      ),
      groups.map((g,gi)=>h("div",{key:gi},
        h("div",{className:"chat-date-sep"},h("span",null,g.date)),
        g.messages.map(m=>{
          const isMe=m.userId===ME.id;
          const sender=isMe?ME:(USERS&&USERS.find(u=>u.id===m.userId));
          const displayName=isMe?(ME.name||"Ich"):(m.userName||sender?.initials||"?");
          const isEditing=editingId===m.id;
          const reacts=groupReactions(m.reactions,ME.id);
          const showReceipt=isMe&&threadId!==null; // ✓/✓✓ nur in DMs
          const isRead=readUpTo!=null&&m.id<=readUpTo;
          const groupReadCount=isMe&&threadId===null?(groupReaders||[]).filter(r=>r.lastReadId>=m.id).length:0;
          return h("div",{key:m.id,className:"chat-msg"+(isMe?" me":"")},
            !isMe&&h(Avatar,{userId:m.userId,size:"xs"}),
            h("div",{className:"chat-bubble-wrap"},
              h("div",{className:"chat-bubble"},
                isEditing
                  ?h("div",{className:"chat-edit-box"},
                      h("textarea",{className:"chat-edit-input",value:editText,autoFocus:true,rows:1,
                        onChange:e=>setEditText(e.target.value),
                        onKeyDown:e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveEdit(m);}else if(e.key==="Escape"){cancelEdit();}}}),
                      h("div",{className:"chat-edit-actions"},
                        h("button",{className:"btn btn-ghost btn-sm",type:"button",onClick:cancelEdit},"Abbrechen"),
                        h("button",{className:"btn btn-primary btn-sm",type:"button",onClick:()=>saveEdit(m)},"Speichern")
                      )
                    )
                  :h(FR,null,
                      m.replyTo&&h("div",{className:"chat-quote"},
                        h("span",{className:"chat-quote-name"},m.replyTo.userName||"?"),
                        h("span",{className:"chat-quote-text"},replyPreview(m.replyTo))
                      ),
                      m.content&&h("div",{className:"chat-text"},q?highlightText(m.content,query.trim()):renderMentions(m.content,colleagueNames,ME.name)),
                      m.attachmentUrl&&h(ChatAttachment,{url:m.attachmentUrl,name:m.attachmentName,isMe}),
                      h("div",{className:"chat-ts"},
                        fmtTime(m.ts),
                        showReceipt&&h("span",{className:"chat-receipt"+(isRead?" read":""),title:isRead?"Gelesen":"Gesendet"},isRead?"✓✓":"✓"),
                        groupReadCount>0&&h("span",{className:"chat-receipt read",title:"Gelesen"},"✓✓ "+groupReadCount)
                      )
                    ),
                !isEditing&&h("div",{className:"chat-msg-actions"},
                  h("button",{className:"chat-act-btn",title:"Antworten",onClick:()=>onReply(m)},h(Icon,{n:"reply",size:13})),
                  h("button",{className:"chat-act-btn",title:"Reagieren",onClick:()=>setPickerId(pickerId===m.id?null:m.id)},h(Icon,{n:"smile",size:13})),
                  h("button",{className:"chat-act-btn"+(m.pinned?" on":""),title:m.pinned?"Pin lösen":"Anpinnen",onClick:()=>onPin(m)},h(Icon,{n:"pin",size:13})),
                  isMe&&m.content&&h("button",{className:"chat-act-btn",title:"Bearbeiten",onClick:()=>startEdit(m)},h(Icon,{n:"edit",size:13})),
                  isMe&&h("button",{className:"chat-act-btn",title:"Löschen",onClick:()=>onDeleteMsg(m)},h(Icon,{n:"trash",size:13}))
                ),
                pickerId===m.id&&h("div",{className:"chat-emoji-picker"},
                  QUICK_EMOJIS.map(em=>h("button",{key:em,className:"chat-emoji-opt",onClick:()=>{onReact(m,em);setPickerId(null);}},em))
                )
              ),
              reacts.length>0&&h("div",{className:"chat-reactions"},
                reacts.map(r=>h("button",{key:r.emoji,className:"chat-react-chip"+(r.mine?" mine":""),title:r.names.join(", "),onClick:()=>onReact(m,r.emoji)},
                  h("span",{className:"cr-emoji"},r.emoji),h("span",{className:"cr-count"},r.count)
                ))
              ),
              h("div",{className:"chat-sender-name"+(isMe?" me":"")},displayName)
            )
          );
        })
      )),
      typingName&&h("div",{className:"chat-typing"},
        h("span",{className:"chat-typing-dots"},h("i"),h("i"),h("i")),
        h("span",null,typingName+" schreibt…")
      ),
      h("div",{ref:bottomRef})
    ),
    pendingFile&&h("div",{className:"chat-pending-file"},
      h("span",{className:"chat-att-icon"},fileIcon(pendingFile.name)),
      h("span",{className:"chat-pending-name"},pendingFile.name),
      h("button",{className:"chat-pending-rm",onClick:onClearFile,title:"Entfernen"},"×")
    ),
    mentionMatches.length>0&&h("div",{className:"chat-mention-menu"},
      mentionMatches.map(u=>h("button",{key:u.id,type:"button",className:"chat-mention-opt",onMouseDown:e=>{e.preventDefault();pickMention(u);}},
        h(Avatar,{userId:u.id,size:"xs"}),
        h("span",{className:"chat-mention-name"},u.name)
      ))
    ),
    replyTarget&&!recording&&h("div",{className:"chat-reply-bar"},
      h(Icon,{n:"reply",size:15}),
      h("div",{className:"chat-reply-info"},
        h("span",{className:"chat-reply-to"},"Antwort an "+(replyTarget.userId===ME.id?"dich":(replyTarget.userName||"?"))),
        h("span",{className:"chat-reply-snippet"},replyPreview(replyTarget)||replyTarget.content)
      ),
      h("button",{type:"button",className:"chat-reply-cancel",title:"Abbrechen",onClick:onCancelReply},"×")
    ),
    recording
      ?h("div",{className:"chat-composer chat-recording"},
          h("button",{type:"button",className:"iconbtn chat-rec-cancel",title:"Abbrechen",onClick:()=>stopRec(false)},h(Icon,{n:"trash",size:17})),
          h("span",{className:"chat-rec-dot"}),
          h("span",{className:"chat-rec-time"},recMMSS),
          h("span",{className:"chat-rec-label"},"Aufnahme…"),
          h("div",{className:"grow"}),
          h("button",{type:"button",className:"btn btn-primary btn-sm chat-rec-send",title:"Senden",onClick:()=>stopRec(true)},h(Icon,{n:"send",size:15}))
        )
      :h("form",{className:"chat-composer",onSubmit:onSend},
          h("input",{type:"file",ref:fileInputRef,style:{display:"none"},onChange:onFileSelect}),
          h("button",{type:"button",className:"iconbtn chat-attach-btn",title:"Datei anhängen",onClick:()=>fileInputRef.current&&fileInputRef.current.click()},
            h(Icon,{n:"paperclip",size:17})
          ),
          h("input",{className:"chat-input",ref:composerRef,placeholder,value:input,onChange:e=>setInput(e.target.value),disabled:sending,autoComplete:"off"}),
          (input.trim()||pendingFile)
            ?h("button",{type:"submit",className:"btn btn-primary btn-sm",disabled:sending},
                sending?h(Icon,{n:"loader",size:15}):h(Icon,{n:"send",size:15}))
            :h("button",{type:"button",className:"iconbtn chat-mic-btn",title:"Sprachnachricht aufnehmen",disabled:sending,onClick:startRec},
                h(Icon,{n:"mic",size:18}))
        )
  );
}

function ChatView(){
  const{ME,USERS}=window.ESG_DATA;
  const[threadId,setThreadId]=S(null);
  const[threads,setThreads]=S({});
  const[unread,setUnread]=S({});
  const[readUpTo,setReadUpTo]=S({}); // { peerId(string): lastReadId }
  const[groupReaders,setGroupReaders]=S([]); // [{userId,lastReadId,userName}]
  const[typing,setTyping]=S({});     // { threadKey: {name, ts} }
  const[input,setInput]=S("");
  const[sending,setSending]=S(false);
  const[loading,setLoading]=S(true);
  const[mobilePane,setMobilePane]=S("list");
  const[pendingFile,setPendingFile]=S(null);
  const[replyTarget,setReplyTarget]=S(null);
  const[searching,setSearching]=S(false);
  const[query,setQuery]=S("");
  const[globalQuery,setGlobalQuery]=S("");
  const[globalResults,setGlobalResults]=S([]);
  const fileInputRef=T(null);
  const lastTypingSent=T(0);

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
        if(threadId!==null){
          setUnread(prev=>({...prev,[String(threadId)]:0}));
          if(data.readUpTo!=null)setReadUpTo(prev=>({...prev,[String(threadId)]:Number(data.readUpTo)}));
        }else{
          setUnread(prev=>({...prev,group:0}));
          if(data.groupReaders)setGroupReaders((data.groupReaders||[]).map(r=>({userId:Number(r.user_id||r.userId),lastReadId:Number(r.lastReadId||r.last_read_id||0),userName:r.user_name||r.userName||""})));
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[threadId]);

  // Globale Suche (debounced) über alle Unterhaltungen.
  v(()=>{
    const qq=globalQuery.trim();
    if(qq.length<2){setGlobalResults([]);return;}
    const t=setTimeout(()=>{
      window.ESG_API.fetch("/api/chat/search?q="+encodeURIComponent(qq))
        .then(d=>setGlobalResults((d.results||[]).map(mapMsg)))
        .catch(()=>{});
    },280);
    return()=>clearTimeout(t);
  },[globalQuery]);

  // Typing-Hinweise nach 4 s automatisch ausblenden.
  v(()=>{
    const t=setInterval(()=>{
      setTyping(prev=>{
        const now=Date.now();let changed=false;const next={...prev};
        for(const k of Object.keys(next)){if(now-next[k].ts>4000){delete next[k];changed=true;}}
        return changed?next:prev;
      });
    },1500);
    return()=>clearInterval(t);
  },[]);

  v(()=>{
    function keyFor(m){return m.recipientId===null?"group":(m.userId===ME.id?String(m.recipientId):String(m.userId));}
    function onChat(e){
      const raw=e.detail&&(e.detail.message||e.detail);
      if(!raw||!raw.id)return;
      const m=mapMsg(raw);
      const mKey=keyFor(m);
      setThreads(prev=>{
        const arr=prev[mKey]||[];
        if(arr.some(x=>x.id===m.id))return prev;
        return{...prev,[mKey]:[...arr,m]};
      });
      // Eingehende Nachricht im aktiven DM-Thread → sofort als gelesen melden.
      const activeKey=threadId===null?"group":String(threadId);
      if(mKey===activeKey&&m.userId!==ME.id&&threadId!==null){
        window.ESG_API.fetch("/api/chat/read",{method:"POST",body:JSON.stringify({to:threadId,lastId:m.id})}).catch(()=>{});
      }else if(m.userId!==ME.id){
        setUnread(prev=>({...prev,[mKey]:(prev[mKey]||0)+1}));
      }
      // Tippt nicht mehr, sobald Nachricht da ist.
      setTyping(prev=>{if(!prev[mKey])return prev;const n={...prev};delete n[mKey];return n;});
    }
    function onUpdated(e){
      const raw=e.detail&&(e.detail.message||e.detail);
      if(!raw||!raw.id)return;
      const m=mapMsg(raw);const mKey=keyFor(m);
      setThreads(prev=>{const arr=prev[mKey]||[];return{...prev,[mKey]:arr.map(x=>x.id===m.id?{...x,...m}:x)};});
    }
    function onDeleted(e){
      const raw=e.detail&&(e.detail.message||e.detail);
      if(!raw||!raw.id)return;
      const id=Number(raw.id);
      setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].filter(x=>x.id!==id);return next;});
    }
    function onReaction(e){
      const raw=e.detail&&(e.detail.message||e.detail);
      if(!raw||!raw.id)return;
      const id=Number(raw.id);
      const reactions=(raw.reactions||[]).map(r=>({emoji:r.emoji,userId:Number(r.user_id||r.userId),userName:r.user_name||r.userName||""}));
      setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].map(x=>x.id===id?{...x,reactions}:x);return next;});
    }
    function onPinned(e){
      const raw=e.detail&&(e.detail.message||e.detail);
      if(!raw||!raw.id)return;
      const id=Number(raw.id),pinned=!!raw.pinned;
      setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].map(x=>x.id===id?{...x,pinned}:x);return next;});
    }
    function onRead(e){
      const d=e.detail&&(e.detail.message||e.detail);
      if(!d||d.reader==null)return;
      const reader=Number(d.reader),lastReadId=Number(d.lastReadId||0);
      if(reader===ME.id)return;
      if(d.group){
        setGroupReaders(prev=>{const i=prev.findIndex(r=>r.userId===reader);const name=(USERS||[]).find(u=>u.id===reader)?.name||"";if(i<0)return[...prev,{userId:reader,lastReadId,userName:name}];const n=[...prev];n[i]={...n[i],lastReadId:Math.max(n[i].lastReadId,lastReadId)};return n;});
      }else{
        setReadUpTo(prev=>({...prev,[String(reader)]:Math.max(prev[String(reader)]||0,lastReadId)}));
      }
    }
    function onTyping(e){
      const d=e.detail&&(e.detail.message||e.detail);
      if(!d||d.userId==null||Number(d.userId)===ME.id)return;
      const tKey=d.to!=null?String(Number(d.userId)):"group"; // im DM ist der Thread der Absender
      const u=(USERS||[]).find(x=>x.id===Number(d.userId));
      const name=(u&&(u.name||"").split(" ")[0])||"Jemand";
      setTyping(prev=>({...prev,[tKey]:{name,ts:Date.now()}}));
    }
    function onSynced(){setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].filter(x=>x.id>0);return next;});}
    function onOpenDM(e){const id=e.detail&&Number(e.detail.userId);if(id)openThread(id);}
    window.addEventListener("esg:offline-synced",onSynced);
    window.addEventListener("esg:open-dm",onOpenDM);
    window.addEventListener("esg:chat",onChat);
    window.addEventListener("esg:chat:updated",onUpdated);
    window.addEventListener("esg:chat:deleted",onDeleted);
    window.addEventListener("esg:chat:reaction",onReaction);
    window.addEventListener("esg:chat:pinned",onPinned);
    window.addEventListener("esg:chat:read",onRead);
    window.addEventListener("esg:chat:typing",onTyping);
    return()=>{
      window.removeEventListener("esg:chat",onChat);
      window.removeEventListener("esg:chat:updated",onUpdated);
      window.removeEventListener("esg:chat:deleted",onDeleted);
      window.removeEventListener("esg:chat:reaction",onReaction);
      window.removeEventListener("esg:chat:pinned",onPinned);
      window.removeEventListener("esg:chat:read",onRead);
      window.removeEventListener("esg:chat:typing",onTyping);
      window.removeEventListener("esg:offline-synced",onSynced);
      window.removeEventListener("esg:open-dm",onOpenDM);
    };
  },[threadId,ME.id]);

  async function pinMsg(m){
    const newState=!m.pinned;
    setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].map(x=>x.id===m.id?{...x,pinned:newState}:x);return next;});
    try{await window.ESG_API.fetch("/api/chat/"+m.id+"/pin",{method:"POST",body:JSON.stringify({})});}
    catch(err){setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].map(x=>x.id===m.id?{...x,pinned:m.pinned}:x);return next;});}
  }

  async function reactMsg(m,emoji){
    // optimistisch: meine Reaktion sofort toggeln
    setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].map(x=>{
      if(x.id!==m.id)return x;
      const has=(x.reactions||[]).some(r=>r.emoji===emoji&&r.userId===ME.id);
      const reactions=has?x.reactions.filter(r=>!(r.emoji===emoji&&r.userId===ME.id)):[...(x.reactions||[]),{emoji,userId:ME.id,userName:ME.name||"Ich"}];
      return{...x,reactions};
    });return next;});
    try{
      const d=await window.ESG_API.fetch("/api/chat/"+m.id+"/react",{method:"POST",body:JSON.stringify({emoji})});
      const reactions=(d.reactions||[]).map(r=>({emoji:r.emoji,userId:Number(r.user_id||r.userId),userName:r.user_name||r.userName||""}));
      setThreads(prev=>{const next={...prev};for(const k of Object.keys(next))next[k]=next[k].map(x=>x.id===m.id?{...x,reactions}:x);return next;});
    }catch(err){/* WS-Event korrigiert es notfalls */}
  }

  function notifyTyping(){
    if(!window.ESG_API.hasSession())return;
    const now=Date.now();
    if(now-lastTypingSent.current<2500)return; // gedrosselt
    lastTypingSent.current=now;
    const body=threadId!==null?{to:threadId}:{};
    window.ESG_API.fetch("/api/chat/typing",{method:"POST",body:JSON.stringify(body)}).catch(()=>{});
  }
  function onInput(val){setInput(val);if(val.trim())notifyTyping();}

  async function editMsg(m,text){
    const prevContent=m.content;
    setThreads(prev=>{const arr=prev[KEY]||[];return{...prev,[KEY]:arr.map(x=>x.id===m.id?{...x,content:text}:x)};});
    try{
      await window.ESG_API.fetch("/api/chat/"+m.id,{method:"PATCH",body:JSON.stringify({content:text})});
    }catch(err){
      setThreads(prev=>{const arr=prev[KEY]||[];return{...prev,[KEY]:arr.map(x=>x.id===m.id?{...x,content:prevContent}:x)};});
      window._addToast&&window._addToast()({title:"Fehler",body:"Nachricht konnte nicht bearbeitet werden."});
    }
  }
  async function deleteMsg(m){
    if(!window.confirm("Diese Nachricht löschen?"))return;
    const arrBefore=threads[KEY]||[];
    setThreads(prev=>{const arr=prev[KEY]||[];return{...prev,[KEY]:arr.filter(x=>x.id!==m.id)};});
    try{
      await window.ESG_API.fetch("/api/chat/"+m.id,{method:"DELETE"});
    }catch(err){
      setThreads(prev=>({...prev,[KEY]:arrBefore}));
      window._addToast&&window._addToast()({title:"Fehler",body:"Nachricht konnte nicht gelöscht werden."});
    }
  }

  function deriveMentions(text){
    if(!text)return[];
    const ids=[];
    (USERS||[]).forEach(u=>{if(u.id!==ME.id&&u.name&&text.includes("@"+u.name))ids.push(u.id);});
    return ids;
  }

  async function deliver(text,file,replyTo){
    let attachmentUrl=null,attachmentName=null;
    if(file){
      const fd=new FormData();
      fd.append("file",file);
      const up=await window.ESG_API.uploadFile("/api/chat/upload",fd);
      attachmentUrl=up.url;
      attachmentName=up.name;
    }
    const body={content:text};
    if(threadId!==null)body.to=threadId;
    if(attachmentUrl)body.attachment_url=attachmentUrl;
    if(attachmentName)body.attachment_name=attachmentName;
    const mentions=deriveMentions(text);
    if(mentions.length)body.mentions=mentions;
    if(replyTo)body.reply_to=replyTo;
    const data=await window.ESG_API.fetch("/api/chat",{method:"POST",body:JSON.stringify(body)});
    const m=mapMsg(data.message);
    setThreads(prev=>{const arr=prev[KEY]||[];return arr.some(x=>x.id===m.id)?prev:{...prev,[KEY]:[...arr,m]};});
  }

  async function send(e){
    e.preventDefault();
    const text=input.trim();
    if(!text&&!pendingFile)return;
    if(sending)return;
    setSending(true);
    setInput("");
    const file=pendingFile;
    const reply=replyTarget?replyTarget.id:null;
    setPendingFile(null);setReplyTarget(null);
    if(fileInputRef.current)fileInputRef.current.value="";
    try{
      await deliver(text,file,reply);
    }catch(err){
      window._addToast&&window._addToast()({title:"Fehler",body:"Nachricht konnte nicht gesendet werden."});
      setInput(text);
    }finally{setSending(false);}
  }

  async function sendVoice(file){
    if(sending||!file)return;
    setSending(true);
    try{
      await deliver("",file);
    }catch(err){
      window._addToast&&window._addToast()({title:"Fehler",body:"Sprachnachricht konnte nicht gesendet werden."});
    }finally{setSending(false);}
  }

  function onFileSelect(e){const f=e.target.files[0]||null;setPendingFile(f);}
  function onClearFile(){setPendingFile(null);if(fileInputRef.current)fileInputRef.current.value="";}

  function openThread(id){
    setThreadId(id);
    const k=id===null?"group":String(id);
    setUnread(prev=>({...prev,[k]:0}));
    setReplyTarget(null);
    setSearching(false);setQuery("");
    setMobilePane("messages");
  }

  const colleagues=(USERS||[]).filter(u=>u.id!==ME.id);
  const totalUnread=Object.values(unread).reduce((a,b)=>a+b,0);
  const activeThread=threadId!==null?(USERS||[]).find(u=>u.id===threadId):null;
  const placeholder=threadId===null?"Nachricht ans Kollegium…":"Nachricht an "+(activeThread?.name||"…");
  const typingName=(typing[KEY]||{}).name||null;
  const threadReadUpTo=threadId!==null?(readUpTo[String(threadId)]||0):null;

  return h("div",{className:"chat-layout"},
    h("div",{className:"dm-list"+(mobilePane==="messages"?" mobile-hidden":"")},
      h("div",{className:"dm-list-head"},
        h("span",null,"Nachrichten"),
        totalUnread>0&&h("span",{className:"dm-badge dm-badge-total"},totalUnread)
      ),
      h("div",{className:"dm-search"},
        h(Icon,{n:"search",size:15}),
        h("input",{placeholder:"Alle Nachrichten durchsuchen…",value:globalQuery,onChange:e=>setGlobalQuery(e.target.value)}),
        globalQuery&&h("button",{className:"dm-search-x",onClick:()=>setGlobalQuery("")},"×")
      ),
      globalQuery.trim().length>=2
        ?h("div",{className:"dm-results"},
            globalResults.length===0
              ?h("div",{className:"dm-results-empty"},"Keine Treffer")
              :globalResults.map(r=>{
                  const target=r.recipientId===null?null:(r.userId===ME.id?r.recipientId:r.userId);
                  const label=r.recipientId===null?"Kollegium":(target===r.userId?(r.userName||"?"):"DM");
                  return h("button",{key:r.id,className:"dm-result",onClick:()=>{openThread(target);setGlobalQuery("");}},
                    h("div",{className:"dm-result-head"},
                      r.recipientId===null?h(Icon,{n:"users",size:13}):h(Avatar,{userId:r.userId,size:"xs"}),
                      h("span",{className:"dm-result-label"},label),
                      h("span",{className:"dm-result-time"},fmtDate(r.ts))
                    ),
                    h("div",{className:"dm-result-text"},highlightText(r.content,globalQuery.trim()))
                  );
                })
          )
        :h(FR,null,
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
          )
    ),
    h("div",{className:"dm-pane"+(mobilePane==="list"?" mobile-hidden":"")},
      h("div",{className:"dm-pane-head"},
        h("button",{className:"dm-back-btn",onClick:()=>setMobilePane("list")},h(Icon,{n:"arrowLeft",size:16})),
        threadId===null
          ?h(FR,null,h("span",{className:"dm-group-icon sm"},h(Icon,{n:"users",size:15})),h("strong",null,"Chat"))
          :h(FR,null,h(Avatar,{userId:threadId,size:"xs"}),h("div",{className:"dm-head-meta"},
              h("strong",null,activeThread?.name||""),
              activeThread?.lastSeenAt&&h("span",{className:"dm-lastseen"},lastSeenLabel(activeThread.lastSeenAt))
            )),
        h("div",{className:"grow"}),
        searching&&h("input",{className:"chat-search-input",autoFocus:true,placeholder:"Suchen…",value:query,onChange:e=>setQuery(e.target.value)}),
        h("button",{className:"iconbtn chat-search-btn"+(searching?" on":""),title:"In Unterhaltung suchen",onClick:()=>{const n=!searching;setSearching(n);if(!n)setQuery("");}},
          h(Icon,{n:searching?"x":"search",size:16})),
        threadId!==null&&h("button",{className:"iconbtn chat-call-btn",title:"Videoanruf starten",onClick:()=>window.startCall&&window.startCall(threadId)},
          h(Icon,{n:"video",size:17}))
      ),
      h(MessagePane,{ME,USERS,threadId,messages:msgs,loading,sending,input,setInput:onInput,onSend:send,placeholder,pendingFile,onFileSelect,onClearFile,fileInputRef,onEditMsg:editMsg,onDeleteMsg:deleteMsg,onReact:reactMsg,readUpTo:threadReadUpTo,typingName,onSendVoice:sendVoice,onReply:setReplyTarget,replyTarget,onCancelReply:()=>setReplyTarget(null),query:searching?query:"",onPin:pinMsg,groupReaders})
    )
  );
}

window.ChatView=ChatView;
})();
