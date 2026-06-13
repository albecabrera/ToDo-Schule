// ========================================================================
//  ToDo-Schule — Chat (Chat + Direktnachrichten)
// ========================================================================
(function(){
const {useState, useEffect, useRef} = React;
const {createElement:h, Fragment} = React;

/* ── helpers ─────────────────────────────────────────────────────────── */
function mapMsg(m){
  return {
    id:          Number(m.id),
    userId:      Number(m.user_id || m.userId),
    recipientId: m.recipient_id != null ? Number(m.recipient_id) : null,
    userName:    m.user_name || m.userName || "",
    content:     m.content,
    ts:          m.created_at || m.ts,
  };
}

function fmtTime(ts){
  if(!ts) return "";
  return new Date(ts).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
}

function fmtDate(ts){
  if(!ts) return "";
  const d = new Date(ts), today = new Date();
  if(d.toDateString()===today.toDateString()) return "Heute";
  const yest = new Date(today); yest.setDate(yest.getDate()-1);
  if(d.toDateString()===yest.toDateString()) return "Gestern";
  return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
}

function groupByDate(msgs){
  const groups = [];
  let curDate = null;
  msgs.forEach(m=>{
    const d = new Date(m.ts).toDateString();
    if(d!==curDate){ groups.push({date:fmtDate(m.ts), messages:[m]}); curDate=d; }
    else groups[groups.length-1].messages.push(m);
  });
  return groups;
}

/* ── Thread list item ─────────────────────────────────────────────────── */
function ThreadItem({label, sub, avatarEl, active, unread, onClick}){
  return h("button",{
    className:`dm-thread ${active?"active":""}`,
    onClick,
  },
    avatarEl,
    h("div",{className:"dm-thread-body"},
      h("div",{className:"dm-thread-name"},label),
      sub && h("div",{className:"dm-thread-sub"},sub)
    ),
    unread > 0 && h("span",{className:"dm-badge"},unread > 9 ? "9+" : unread)
  );
}

/* ── Message area ─────────────────────────────────────────────────────── */
function MessagePane({ME, threadId, messages, loading, sending, input, setInput, onSend, placeholder}){
  const bottomRef = useRef(null);

  useEffect(()=>{
    if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"});
  },[messages]);

  const groups = groupByDate(messages);

  return h(Fragment,null,
    h("div",{className:"chat-messages"},
      loading && h("div",{className:"chat-empty"},"Wird geladen…"),
      !loading && messages.length===0 && h("div",{className:"chat-empty"},
        h("div",{style:{fontSize:36}},threadId===null ? "💬" : "🤝"),
        h("div",{style:{marginTop:8}}, threadId===null
          ? "Noch keine Nachrichten im Kollegium."
          : "Noch keine Direktnachrichten."
        )
      ),
      groups.map((g,gi)=>h("div",{key:gi},
        h("div",{className:"chat-date-sep"},h("span",null,g.date)),
        g.messages.map(m=>{
          const isMe = m.userId === ME.id;
          const sender = isMe ? ME : (USERS.find(u=>u.id===m.userId));
          const displayName = isMe ? (ME.name||"Ich") : (m.userName || sender?.initials || "?");
          return h("div",{key:m.id, className:`chat-msg ${isMe?"me":""}`},
            !isMe && h(Avatar,{userId:m.userId, size:"xs"}),
            h("div",{className:"chat-bubble-wrap"},
              h("div",{className:"chat-bubble"},
                h("div",{className:"chat-text"},m.content),
                h("div",{className:"chat-ts"},fmtTime(m.ts))
              ),
              h("div",{className:`chat-sender-name ${isMe?"me":""}`},displayName)
            )
          );
        })
      )),
      h("div",{ref:bottomRef})
    ),
    h("form",{className:"chat-composer",onSubmit:onSend},
      h("input",{
        className:"chat-input",
        placeholder,
        value:input,
        onChange:e=>setInput(e.target.value),
        disabled:sending,
        autoComplete:"off",
      }),
      h("button",{type:"submit",className:"btn btn-primary btn-sm",disabled:!input.trim()||sending},
        sending ? h(Icon,{n:"loader",size:15}) : h(Icon,{n:"send",size:15})
      )
    )
  );
}

/* ── Main ChatView ─────────────────────────────────────────────────────── */
function ChatView(){
  const {ME, USERS} = window.ESG_DATA;
  // threadId: null = Kollegiumschat, number = DM with userId
  const [threadId, setThreadId]   = useState(null);
  const [threads, setThreads]     = useState({}); // { null: [msgs], uid: [msgs] }
  const [unread, setUnread]       = useState({});  // { uid: count }
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [mobilePane, setMobilePane] = useState("list"); // "list" | "messages"

  const KEY = threadId === null ? "group" : String(threadId);
  const msgs = threads[KEY] || [];

  // Load thread on change
  useEffect(()=>{
    if(!window.ESG_API.hasSession()){ setLoading(false); return; }
    setLoading(true);
    const qs = threadId !== null ? `?to=${threadId}` : "";
    window.ESG_API.fetch(`/api/chat${qs}`)
      .then(data=>{
        const mapped = (data.messages||[]).map(mapMsg);
        setThreads(prev=>({...prev, [KEY]:mapped}));
        // clear unread for this thread
        if(threadId !== null) setUnread(prev=>({...prev,[String(threadId)]:0}));
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[threadId]);

  // Real-time WS events
  useEffect(()=>{
    function onChat(e){
      const raw = e.detail && (e.detail.message || e.detail);
      if(!raw || !raw.id) return;
      const m = mapMsg(raw);
      // Which thread does this message belong to?
      const mKey = m.recipientId === null
        ? "group"
        : (m.userId === ME.id ? String(m.recipientId) : String(m.userId));

      setThreads(prev=>{
        const arr = prev[mKey] || [];
        if(arr.some(x=>x.id===m.id)) return prev;
        return {...prev, [mKey]: [...arr, m]};
      });

      // Increment unread if not viewing this thread
      const activeKey = threadId === null ? "group" : String(threadId);
      if(mKey !== activeKey && m.userId !== ME.id){
        setUnread(prev=>({...prev,[mKey]:(prev[mKey]||0)+1}));
      }
    }
    window.addEventListener("esg:chat", onChat);
    return ()=>window.removeEventListener("esg:chat", onChat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[threadId, ME.id]);

  async function send(e){
    e.preventDefault();
    const text = input.trim();
    if(!text || sending) return;
    setSending(true);
    setInput("");
    try{
      const body = {content: text};
      if(threadId !== null) body.to = threadId;
      const data = await window.ESG_API.fetch("/api/chat",{method:"POST",body:JSON.stringify(body)});
      const m = mapMsg(data.message);
      setThreads(prev=>{
        const arr = prev[KEY] || [];
        return arr.some(x=>x.id===m.id) ? prev : {...prev, [KEY]:[...arr, m]};
      });
    }catch(err){
      window._addToast && window._addToast()({title:"Fehler",body:"Nachricht konnte nicht gesendet werden."});
      setInput(text);
    }finally{ setSending(false); }
  }

  function openThread(id){
    setThreadId(id);
    const k = id === null ? "group" : String(id);
    setUnread(prev=>({...prev,[k]:0}));
    setMobilePane("messages");
  }

  // Colleagues excluding self
  const colleagues = USERS.filter(u=>u.id !== ME.id);
  const totalUnread = Object.values(unread).reduce((a,b)=>a+b,0);

  const activeThread = threadId !== null ? USERS.find(u=>u.id===threadId) : null;
  const placeholder  = threadId === null
    ? "Nachricht ans Kollegium…"
    : `Nachricht an ${activeThread?.name||"…"}`;

  return h("div",{className:"chat-layout"},
    /* ── Thread list ── */
    h("div",{className:`dm-list ${mobilePane==="messages"?"mobile-hidden":""}`},
      h("div",{className:"dm-list-head"},
        h("span",null,"Nachrichten"),
        totalUnread > 0 && h("span",{className:"dm-badge dm-badge-total"},totalUnread)
      ),
      /* Group chat */
      h(ThreadItem,{
        label:"Kollegium",
        sub:"Alle Kolleg:innen",
        avatarEl:h("span",{className:"dm-group-icon"},h(Icon,{n:"users",size:18})),
        active:threadId===null,
        unread:unread["group"]||0,
        onClick:()=>openThread(null),
      }),
      h("div",{className:"dm-sep"}),
      h("div",{className:"dm-list-label"},"Direktnachrichten"),
      /* DM threads per colleague */
      colleagues.map(u=>h(ThreadItem,{
        key:u.id,
        label:u.name,
        sub:u.email||"",
        avatarEl:h(Avatar,{userId:u.id,size:"sm"}),
        active:threadId===u.id,
        unread:unread[String(u.id)]||0,
        onClick:()=>openThread(u.id),
      }))
    ),

    /* ── Message pane ── */
    h("div",{className:`dm-pane ${mobilePane==="list"?"mobile-hidden":""}`},
      /* Mobile back button + header */
      h("div",{className:"dm-pane-head"},
        h("button",{className:"dm-back-btn",onClick:()=>setMobilePane("list")},
          h(Icon,{n:"arrowLeft",size:16})
        ),
        threadId === null
          ? h(Fragment,null,
              h("span",{className:"dm-group-icon sm"},h(Icon,{n:"users",size:15})),
              h("strong",null,"Kollegiumschat")
            )
          : h(Fragment,null,
              h(Avatar,{userId:threadId,size:"xs"}),
              h("strong",null,activeThread?.name||"")
            )
      ),
      h(MessagePane,{
        ME, threadId, messages:msgs, loading, sending,
        input, setInput, onSend:send, placeholder,
      })
    )
  );
}

window.ChatView = ChatView;
})();
