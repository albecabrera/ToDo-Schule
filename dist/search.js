// dist/search.js — ToDo-Schule · Globale App-Suche (Aufgaben + Notizen + Anhänge)
// Geöffnet via CustomEvent "esg:open-search" mit optionalem detail.q
(function(){
"use strict";
const{useState:S,useEffect:v,useRef:T,useCallback:cb}=React,h=React.createElement;

const MIME_ICONS={
  'application/pdf':'📄','image/jpeg':'🖼','image/png':'🖼','image/gif':'🖼','image/webp':'🖼',
  'audio/mpeg':'🎵','audio/ogg':'🎵','video/mp4':'🎬',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'📝',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':'📊',
  'application/zip':'🗜','text/plain':'📋','text/csv':'📊',
};
function mimeIcon(mime){return MIME_ICONS[mime]||'📎';}
function fmtSize(bytes){if(bytes<1024)return bytes+'B';if(bytes<1048576)return Math.round(bytes/1024)+'KB';return(bytes/1048576).toFixed(1)+'MB';}

let _timer=null;
function debounce(fn,ms){
  return function(...a){clearTimeout(_timer);_timer=setTimeout(()=>fn(...a),ms);}
}

function GlobalSearch(){
  const[open,setOpen]=S(false);
  const[q,setQ]=S('');
  const[res,setRes]=S(null); // {tasks,notes,attachments,total}
  const[loading,setLoading]=S(false);
  const inputRef=T(null);

  const doSearch=cb(debounce(async function(query){
    if(query.length<2){setRes(null);setLoading(false);return;}
    setLoading(true);
    try{
      const r=await window.ESG_API.fetch('/api/search?q='+encodeURIComponent(query)+'&limit=10');
      setRes(r);
    }catch(e){setRes(null);}
    setLoading(false);
  },320),[]);

  v(()=>{
    function onOpen(e){
      setOpen(true);
      const initQ=(e&&e.detail&&e.detail.q)||'';
      setQ(initQ);
      setRes(null);
      if(initQ.length>=2)doSearch(initQ);
    }
    window.addEventListener('esg:open-search',onOpen);
    return()=>window.removeEventListener('esg:open-search',onOpen);
  },[doSearch]);

  v(()=>{if(open&&inputRef.current)setTimeout(()=>inputRef.current&&inputRef.current.focus(),30);},[open]);

  function close(){setOpen(false);setQ('');setRes(null);}

  function onChange(e){
    const v=e.target.value;
    setQ(v);
    if(v.length>=2)doSearch(v);
    else{setRes(null);setLoading(false);}
  }

  function goTask(id){
    window.ESG_CMD&&window.ESG_CMD.setSection&&window.ESG_CMD.setSection('tasks');
    window.ESG_CMD&&window.ESG_CMD.openTask&&window.ESG_CMD.openTask(id);
    close();
  }
  function goNote(){
    window.ESG_CMD&&window.ESG_CMD.setSection&&window.ESG_CMD.setSection('notes');
    close();
  }

  function onKey(e){if(e.key==='Escape')close();}

  if(!open)return null;

  const hasTasks=res&&res.tasks&&res.tasks.length>0;
  const hasNotes=res&&res.notes&&res.notes.length>0;
  const hasAtt=res&&res.attachments&&res.attachments.length>0;
  const empty=res&&!hasTasks&&!hasNotes&&!hasAtt;

  return h('div',{className:'gsearch-scrim',onClick:close,role:'dialog','aria-modal':'true','aria-label':'Globale Suche'},
    h('div',{className:'gsearch',onClick:e=>e.stopPropagation(),onKeyDown:onKey},
      h('div',{className:'gsearch-head'},
        h(Icon,{n:'search',size:18}),
        h('input',{ref:inputRef,className:'gsearch-input',placeholder:'Aufgaben, Notizen, Anhänge durchsuchen…',
          value:q,onChange,autoComplete:'off','aria-label':'Suche'}),
        loading&&h('span',{className:'gsearch-spin'},h(Icon,{n:'activity',size:16,className:'spin'})),
        h('button',{className:'gsearch-close iconbtn',onClick:close,'aria-label':'Schließen'},h(Icon,{n:'x',size:16}))
      ),
      h('div',{className:'gsearch-body'},
        !res&&!loading&&q.length<2&&h('div',{className:'gsearch-tip'},
          h(Icon,{n:'search',size:28}),
          h('p',null,'Mindestens 2 Zeichen eingeben')
        ),
        empty&&h('div',{className:'gsearch-tip'},
          h(Icon,{n:'meh',size:28}),
          h('p',null,'Keine Treffer für „'+q+'"')
        ),
        hasTasks&&h('div',{className:'gsearch-section'},
          h('div',{className:'gsearch-label'},h(Icon,{n:'check',size:13}),'Aufgaben'),
          res.tasks.map(t=>h('button',{key:'t'+t.id,className:'gsearch-item',onClick:()=>goTask(t.id)},
            h('span',{className:'gsearch-ico'},h(Icon,{n:'check',size:15})),
            h('span',{className:'gsearch-main'},
              h('span',{className:'gsearch-title'},t.title),
              t.description&&h('span',{className:'gsearch-sub'},t.description.slice(0,80))
            ),
            t.status&&h('span',{className:'gsearch-tag'},t.status)
          ))
        ),
        hasNotes&&h('div',{className:'gsearch-section'},
          h('div',{className:'gsearch-label'},h(Icon,{n:'book',size:13}),'Notizen & Planungen'),
          res.notes.map(n=>h('button',{key:'n'+n.id,className:'gsearch-item',onClick:goNote},
            h('span',{className:'gsearch-ico'},h(Icon,{n:'book',size:15})),
            h('span',{className:'gsearch-main'},
              h('span',{className:'gsearch-title'},n.title||'Ohne Titel'),
              h('span',{className:'gsearch-sub'},n.kind+' · '+n.author_name)
            )
          ))
        ),
        hasAtt&&h('div',{className:'gsearch-section'},
          h('div',{className:'gsearch-label'},h(Icon,{n:'paperclip',size:13}),'Anhänge'),
          res.attachments.map(a=>h('div',{key:'a'+a.id,className:'gsearch-item gsearch-item--att'},
            h('span',{className:'gsearch-ico'},mimeIcon(a.mime_type)),
            h('span',{className:'gsearch-main'},
              h('span',{className:'gsearch-title'},a.original_name),
              h('span',{className:'gsearch-sub'},
                (a.task_title?'Aufgabe: '+a.task_title:a.note_title?'Notiz: '+a.note_title:'')+' · '+fmtSize(a.size)
              )
            )
          ))
        ),
        res&&res.total>0&&h('div',{className:'gsearch-footer'},res.total,' Treffer')
      )
    )
  );
}
window.GlobalSearch=GlobalSearch;
})();
