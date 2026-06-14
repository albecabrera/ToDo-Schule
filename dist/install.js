// dist/install.js — ToDo-Schule · „App installieren"-Button (PWA)
// Fängt beforeinstallprompt ab und zeigt einen eigenen Installieren-Chip,
// statt nur auf den (versteckten) Browser-Hinweis zu warten.
(function(){
"use strict";
let deferred=null, chip=null;

function isStandalone(){
  return window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone===true;
}

function makeChip(){
  if(chip)return chip;
  chip=document.createElement("button");
  chip.className="install-chip";
  chip.type="button";
  chip.setAttribute("aria-label","App installieren");
  chip.innerHTML='<span class="install-ico" aria-hidden="true">⬇️</span><span>App installieren</span>'
    +'<span class="install-x" role="button" aria-label="Ausblenden" title="Ausblenden">×</span>';
  document.body.appendChild(chip);
  chip.addEventListener("click",async e=>{
    if(e.target.classList.contains("install-x")){hide();sessionStorage.setItem("esg-install-dismissed","1");return;}
    if(!deferred)return;
    chip.classList.remove("show");
    deferred.prompt();
    try{await deferred.userChoice;}catch(_){}
    deferred=null;
  });
  return chip;
}
function show(){ if(sessionStorage.getItem("esg-install-dismissed"))return; makeChip().classList.add("show"); }
function hide(){ if(chip)chip.classList.remove("show"); }

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  if(isStandalone())return;
  deferred=e;
  // Erst nach kurzem Moment zeigen (nicht sofort beim Laden aufdringlich).
  setTimeout(show,4000);
});
window.addEventListener("appinstalled",()=>{deferred=null;hide();});
})();
