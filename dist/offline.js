// dist/offline.js — ToDo-Schule · Offline-First (Outbox + Auto-Sync)
// Schreibvorgänge ohne Netz landen in IndexedDB und werden bei Rückkehr der
// Verbindung automatisch nachgesendet. Optimistische Antwort, damit die UI
// sofort reagiert; nach dem Sync lädt die App die Wahrheit vom Server neu.
(function(){
"use strict";

const DB="esg-offline", STORE="outbox";
let dbp=null;
function db(){
  if(dbp)return dbp;
  dbp=new Promise((res,rej)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});};
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
  return dbp;
}
async function tx(mode,fn){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(STORE,mode),s=t.objectStore(STORE);const out=fn(s);t.oncomplete=()=>res(out._v!==undefined?out._v:out);t.onerror=()=>rej(t.error);});}
function add(item){return tx("readwrite",s=>{s.add(item);return{};});}
function all(){return tx("readonly",s=>{const o={_v:[]};s.getAll().onsuccess=e=>o._v=e.target.result||[];return o;});}
function del(id){return tx("readwrite",s=>{s.delete(id);return{};});}
function count(){return tx("readonly",s=>{const o={_v:0};s.count().onsuccess=e=>o._v=e.target.result;return o;});}

// Endpunkte, die offline keinen Sinn ergeben (flüchtig) → nicht einreihen.
const SKIP=[/\/typing$/,/\/read$/,/\/call\/signal$/];
function shouldQueue(path){return !SKIP.some(re=>re.test(path));}

const nowIso=()=>new Date().toISOString().slice(0,19).replace("T"," ");
function meId(){try{return window.ESG_DATA.ME.id;}catch(e){return 0;}}

// Optimistische Antwort passend zum Endpunkt erzeugen.
function synth(path,opts){
  const method=(opts.method||"GET").toUpperCase();
  let body={};try{body=opts.body?JSON.parse(opts.body):{};}catch(e){}
  const tempId=-(Date.now());
  if(method==="DELETE")return null;
  if(/\/api\/tasks(\?|$)/.test(path)&&method==="POST")return{task:{id:tempId,created_at:nowIso(),...body,_offline:true}};
  if(/\/api\/tasks\/\d/.test(path))return{task:{...body,id:Number((path.match(/tasks\/(\d+)/)||[])[1])||tempId,_offline:true}};
  if(/\/api\/notes(\?|$)/.test(path)&&method==="POST")return{note:{id:tempId,created_at:nowIso(),created_by:meId(),...body,_offline:true}};
  if(/\/api\/notes\/\d/.test(path))return{note:{...body,id:Number((path.match(/notes\/(\d+)/)||[])[1])||tempId,_offline:true}};
  if(/\/api\/chat(\?|$)/.test(path)&&method==="POST")return{message:{id:tempId,user_id:meId(),content:body.content||"",recipient_id:body.to??null,attachment_url:body.attachment_url||null,attachment_name:body.attachment_name||null,created_at:nowIso(),_offline:true}};
  return{ok:true,_offline:true};
}

let flushing=false;
async function enqueue(path,opts){
  await add({path,method:(opts.method||"GET").toUpperCase(),body:opts.body||null,ts:Date.now()});
  updateBanner();
  if(navigator.serviceWorker&&navigator.serviceWorker.ready){
    try{const reg=await navigator.serviceWorker.ready;reg.sync&&reg.sync.register("esg-outbox").catch(()=>{});}catch(e){}
  }
  return synth(path,opts);
}

async function flush(){
  if(flushing||!navigator.onLine)return;
  flushing=true;
  try{
    const items=(await all()).sort((a,b)=>a.id-b.id);
    for(const it of items){
      // Temp-IDs (negativ) kennt der Server nicht → solche PATCH/DELETE überspringen.
      if(/\/(tasks|notes|chat)\/-\d/.test(it.path)){await del(it.id);continue;}
      try{
        await window.ESG_API.fetch(it.path,{method:it.method,body:it.body});
        await del(it.id);
      }catch(err){
        // 4xx/5xx (Server erreicht) → verwerfen, sonst Endlosschleife.
        if(err&&err.code&&err.code!==0&&typeof err.code==="number"){await del(it.id);}
        else break; // Netzfehler → später erneut
      }
    }
  }finally{
    flushing=false;
    updateBanner();
    const left=await count();
    if(left===0)window.dispatchEvent(new CustomEvent("esg:offline-synced"));
  }
}

/* ── Status-Banner (eigenes DOM, kein React) ──────────────────────────── */
let bannerEl=null;
function banner(){
  if(bannerEl)return bannerEl;
  bannerEl=document.createElement("div");
  bannerEl.className="offline-banner";
  document.body.appendChild(bannerEl);
  return bannerEl;
}
async function updateBanner(){
  const el=banner();
  const pending=await count();
  if(!navigator.onLine){
    el.className="offline-banner show off";
    el.textContent=pending>0?("Offline · "+pending+" ausstehend"):"Offline — Änderungen werden gespeichert";
  }else if(pending>0){
    el.className="offline-banner show sync";
    el.textContent="Wird synchronisiert… ("+pending+")";
  }else{
    el.className="offline-banner";
  }
}

window.addEventListener("online",()=>{updateBanner();flush();});
window.addEventListener("offline",updateBanner);
if(navigator.serviceWorker){navigator.serviceWorker.addEventListener("message",e=>{if(e.data==="esg-flush")flush();});}

window.ESG_OFFLINE={shouldQueue,enqueue,flush,pending:count};
// Beim Start: Rest der Outbox nachsenden + Banner setzen.
setTimeout(()=>{updateBanner();flush();},1500);
})();
