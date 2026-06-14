// dist/call.js — ToDo-Schule · WebRTC 1:1 Video/Audio-Anruf
// Signalisierung über das bestehende WS-Bridge (events-Tabelle).
// Medien laufen P2P (RTCPeerConnection). STUN: Google. (TURN ggf. für strenge NATs.)
(function(){
"use strict";
const{useState:S,useEffect:v,useRef:T}=React,h=React.createElement;
const ICE={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]};

function signal(to,kind,data){
  return window.ESG_API.fetch("/api/chat/call/signal",{method:"POST",body:JSON.stringify({to,kind,data})}).catch(()=>{});
}
function userName(id){const{USERS,ME}=window.ESG_DATA;if(id===ME.id)return ME.name;const u=(USERS||[]).find(x=>x.id===id);return(u&&u.name)||"Kollege:in";}

function CallManager(){
  const{ME}=window.ESG_DATA;
  const[state,setState]=S("idle"); // idle|calling|ringing|connected
  const[peer,setPeer]=S(null);     // userId des Gegenübers
  const[video,setVideo]=S(true);
  const[muted,setMuted]=S(false);
  const pcRef=T(null),localRef=T(null),remoteRef=T(null),localStreamRef=T(null),pendingIce=T([]),offerRef=T(null);

  function attach(el,stream){if(el&&stream&&el.srcObject!==stream){el.srcObject=stream;}}

  function cleanup(){
    try{pcRef.current&&pcRef.current.close();}catch(e){}
    pcRef.current=null;
    if(localStreamRef.current){localStreamRef.current.getTracks().forEach(t=>t.stop());localStreamRef.current=null;}
    pendingIce.current=[];offerRef.current=null;
    setState("idle");setPeer(null);setMuted(false);setVideo(true);
  }

  function newPc(other){
    const pc=new RTCPeerConnection(ICE);
    pc.onicecandidate=e=>{if(e.candidate)signal(other,"ice",e.candidate);};
    pc.ontrack=e=>{attach(remoteRef.current,e.streams[0]);};
    pc.onconnectionstatechange=()=>{if(["failed","disconnected","closed"].includes(pc.connectionState)){/* lassen, Hangup räumt auf */}};
    pcRef.current=pc;
    return pc;
  }

  async function getMedia(){
    const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    localStreamRef.current=stream;
    attach(localRef.current,stream);
    return stream;
  }

  // ── Anruf starten ──
  async function startCall(other){
    if(state!=="idle"){return;}
    if(!navigator.mediaDevices||!window.RTCPeerConnection){
      window._addToast&&window._addToast()({title:"Nicht unterstützt",body:"Anrufe brauchen HTTPS und einen aktuellen Browser."});
      return;
    }
    setPeer(other);setState("calling");
    try{
      const stream=await getMedia();
      const pc=newPc(other);
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      signal(other,"offer",offer);
    }catch(err){
      window._addToast&&window._addToast()({title:"Kein Zugriff",body:"Kamera/Mikrofon nicht verfügbar."});
      cleanup();
    }
  }

  async function accept(){
    const other=peer,offer=offerRef.current;
    if(!offer)return;
    try{
      const stream=await getMedia();
      const pc=newPc(other);
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for(const c of pendingIce.current){try{await pc.addIceCandidate(c);}catch(e){}}
      pendingIce.current=[];
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signal(other,"answer",answer);
      setState("connected");
    }catch(err){
      window._addToast&&window._addToast()({title:"Kein Zugriff",body:"Kamera/Mikrofon nicht verfügbar."});
      decline();
    }
  }
  function decline(){const other=peer;if(other)signal(other,"hangup");cleanup();}
  function hangup(){const other=peer;if(other)signal(other,"hangup");cleanup();}

  function toggleMute(){const s=localStreamRef.current;if(!s)return;const m=!muted;s.getAudioTracks().forEach(t=>t.enabled=!m);setMuted(m);}
  function toggleVideo(){const s=localStreamRef.current;if(!s)return;const on=!video;s.getVideoTracks().forEach(t=>t.enabled=on);setVideo(on);}

  // ── Signalisierung empfangen ──
  v(()=>{
    async function onSig(e){
      const d=e.detail&&(e.detail.message||e.detail);if(!d||d.from==null)return;
      const from=Number(d.from);
      if(d.kind==="offer"){
        if(state!=="idle"){signal(from,"hangup");return;} // schon im Gespräch → ablehnen
        offerRef.current=d.data;setPeer(from);setState("ringing");
      }else if(d.kind==="answer"){
        if(pcRef.current){try{await pcRef.current.setRemoteDescription(new RTCSessionDescription(d.data));setState("connected");}catch(e){}}
      }else if(d.kind==="ice"){
        if(pcRef.current&&pcRef.current.remoteDescription){try{await pcRef.current.addIceCandidate(d.data);}catch(e){}}
        else pendingIce.current.push(d.data);
      }else if(d.kind==="hangup"){
        cleanup();
      }
    }
    window.addEventListener("esg:call",onSig);
    return()=>window.removeEventListener("esg:call",onSig);
  },[state,peer]);

  window.startCall=startCall;

  if(state==="idle")return null;
  const name=peer!=null?userName(peer):"";
  return h("div",{className:"call-overlay",role:"dialog","aria-modal":"true","aria-label":"Anruf"},
    h("div",{className:"call-stage"},
      h("video",{ref:remoteRef,className:"call-remote",autoPlay:true,playsInline:true}),
      h("video",{ref:localRef,className:"call-local",autoPlay:true,playsInline:true,muted:true}),
      (state==="calling"||state==="ringing")&&h("div",{className:"call-status"},
        h(Avatar,{userId:peer,size:"lg"}),
        h("div",{className:"call-name"},name),
        h("div",{className:"call-sub"},state==="calling"?"Ruft an…":"Eingehender Anruf")
      ),
      state==="connected"&&h("div",{className:"call-badge"},h("span",{className:"call-live"}),name)
    ),
    h("div",{className:"call-controls"},
      state==="connected"&&h(FR0,null,
        h("button",{className:"call-btn"+(muted?" off":""),title:muted?"Ton an":"Stumm",onClick:toggleMute},h(Icon,{n:muted?"micOff":"mic",size:22})),
        h("button",{className:"call-btn"+(video?"":" off"),title:video?"Kamera aus":"Kamera an",onClick:toggleVideo},h(Icon,{n:"video",size:22}))
      ),
      state==="ringing"&&h("button",{className:"call-btn accept",title:"Annehmen",onClick:accept},h(Icon,{n:"phone",size:24})),
      h("button",{className:"call-btn hangup",title:state==="ringing"?"Ablehnen":"Auflegen",onClick:state==="ringing"?decline:hangup},h(Icon,{n:"phoneOff",size:24}))
    )
  );
}
const FR0=React.Fragment;
window.CallManager=CallManager;
})();
