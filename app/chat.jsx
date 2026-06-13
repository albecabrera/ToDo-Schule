// ========================================================================
//  ToDo-Schule — Kollegiumschat
// ========================================================================
(function(){
const {useState, useEffect, useRef, useCallback} = React;
const {createElement:h} = React;

function ChatView(){
  const {ME} = window.ESG_DATA;
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const bottomRef = useRef(null);

  function mapMsg(m){
    return {
      id: Number(m.id), userId: Number(m.user_id||m.userId),
      userName: m.user_name||m.userName||"", content: m.content, ts: m.created_at||m.ts,
    };
  }

  // Load history on mount
  useEffect(()=>{
    if(!window.ESG_API.hasSession()){ setLoading(false); return; }
    window.ESG_API.getChat()
      .then(msgs => setMessages(msgs))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  // Subscribe to real-time chat messages via CustomEvent from app.jsx
  useEffect(()=>{
    function onChat(e){
      const m = e.detail && (e.detail.message || e.detail);
      if(!m || !m.id) return;
      setMessages(prev => {
        const msg = mapMsg(m);
        if(prev.some(x=>x.id===msg.id)) return prev;
        return [...prev, msg];
      });
    }
    window.addEventListener("esg:chat", onChat);
    return ()=>window.removeEventListener("esg:chat", onChat);
  },[]);

  // Auto-scroll to bottom when messages change
  useEffect(()=>{
    if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"});
  },[messages]);

  async function send(e){
    e.preventDefault();
    const text = input.trim();
    if(!text || sending) return;
    setSending(true);
    setInput("");
    try{
      const msg = await window.ESG_API.sendChat(text);
      setMessages(prev => prev.some(x=>x.id===msg.id) ? prev : [...prev, msg]);
    }catch(err){
      window._addToast && window._addToast()({title:"Fehler",body:"Nachricht konnte nicht gesendet werden."});
      setInput(text);
    }finally{ setSending(false); }
  }

  function fmtTime(ts){
    if(!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  }

  function fmtDate(ts){
    if(!ts) return "";
    const d = new Date(ts);
    const today = new Date();
    if(d.toDateString()===today.toDateString()) return "Heute";
    const yest = new Date(today); yest.setDate(yest.getDate()-1);
    if(d.toDateString()===yest.toDateString()) return "Gestern";
    return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
  }

  // Group messages by date
  function groupByDate(msgs){
    const groups = [];
    let curDate = null;
    msgs.forEach(m=>{
      const d = new Date(m.ts).toDateString();
      if(d!==curDate){ groups.push({date:fmtDate(m.ts),messages:[m]}); curDate=d; }
      else groups[groups.length-1].messages.push(m);
    });
    return groups;
  }

  const groups = groupByDate(messages);

  return h("div",{className:"chat-view"},
    h("div",{className:"chat-messages"},
      loading && h("div",{className:"chat-empty"},"Nachrichten werden geladen…"),
      !loading && messages.length===0 && h("div",{className:"chat-empty"},
        h(Icon,{n:"messageCircle",size:32,style:{color:"var(--text-3)",marginBottom:8}}),
        h("div",null,"Noch keine Nachrichten."),
        h("div",{style:{fontSize:12,color:"var(--text-3)",marginTop:4}},"Schreib die erste Nachricht ans Kollegium!")
      ),
      groups.map((g,gi)=>h("div",{key:gi},
        h("div",{className:"chat-date-sep"},h("span",null,g.date)),
        g.messages.map(m=>{
          const isMe = m.userId === ME.id;
          return h("div",{key:m.id, className:`chat-msg ${isMe?"me":""}`},
            !isMe && h(Avatar,{userId:m.userId, size:"xs"}),
            h("div",{className:"chat-bubble"},
              !isMe && h("div",{className:"chat-name"},m.userName),
              h("div",{className:"chat-text"},m.content),
              h("div",{className:"chat-ts"},fmtTime(m.ts))
            )
          );
        })
      )),
      h("div",{ref:bottomRef})
    ),
    h("form",{className:"chat-composer",onSubmit:send},
      h("input",{
        className:"chat-input",
        placeholder:"Nachricht an das Kollegium…",
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

window.ChatView = ChatView;
})();
