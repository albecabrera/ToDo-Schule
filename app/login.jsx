// ========================================================================
//  ToDo-Schule — Login & Onboarding Screen
// ========================================================================
(function(){
const {useState} = React;
const {createElement:h} = React;
const {ME} = window.ESG_DATA;

function LoginScreen({onLogin}){
  const [step, setStep] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [name, setName]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Echter Login/Registrierung gegen das PHP-Backend.
  // Lehrer melden sich mit ihrem Kürzel an ('ca' für Cabrera); E-Mail geht auch.
  async function submit(e){
    e.preventDefault();
    setLoading(true);
    setError(null);
    try{
      if(step==="register") await window.ESG_API.register(name, email, pass);
      else                  await window.ESG_API.login(email.trim(), pass);
      onLogin();
    }catch(err){
      setError(err.error || err.message || "Anmeldung fehlgeschlagen.");
    }finally{
      setLoading(false);
    }
  }

  // Demo-Modus: ohne Backend, Mock-Daten
  function demoLogin(){
    window.ESG_API.clearTokens();
    onLogin();
  }

  const brand = h("div",{className:"brand-lockup"},
    h("div",{className:"brand-tile"},h("img",{src:"assets/esg-mark.svg",alt:"ESG"})),
    h("div",null,
      h("div",{className:"brand-name"},"ToDo-Schule"),
      h("div",{className:"brand-sub"},"Elisabeth-Selbert-Gesamtschule")
    )
  );

  const points = [
    {icon:"users",    txt:"Kollegial — Aufgaben zuweisen, Teams koordinieren"},
    {icon:"activity", txt:"Live — Echtzeit-Updates und Benachrichtigungen"},
    {icon:"sparkle",  txt:"Premium — Klar strukturiert, schnell und schön"},
  ];

  return h("div",{className:"login"},
    // ── Brand panel (left) ──────────────────────────────────────────
    h("div",{className:"login-brand"},
      h("div",{className:"glow a"}),
      h("div",{className:"glow b"}),
      h("img",{src:"assets/esg-mark-ondark.svg",className:"ribbon",alt:""}),
      brand,
      h("div",{className:"login-hero"},
        h("h1",null,"Das Kollegium im ",h("span",{className:"text-gradient"},"Gleichklang")),
        h("p",null,"Verwaltet Aufgaben, koordiniert Projekte und bleibt als Kollegium stets auf dem neuesten Stand.")
      ),
      h("div",{className:"login-points"},
        points.map(p => h("div",{key:p.txt,className:"login-point"},
          h("div",{className:"ic"},h(Icon,{n:p.icon,size:18})),
          h("span",null,p.txt)
        ))
      ),
      h("div",{className:"login-foot"},
        "© 2026 Elisabeth-Selbert-Gesamtschule · Bonn-Bad Godesberg"
      )
    ),
    // ── Form panel (right) ──────────────────────────────────────────
    h("div",{className:"login-form-wrap"},
      h("div",{className:"login-card"},
        step !== "forgot" && h("div",{className:"brand-lockup",style:{marginBottom:28}},
          h("div",{className:"brand-tile sm",style:{boxShadow:"var(--sh-2)",border:"1px solid var(--border)"}},
            h("img",{src:"assets/esg-mark.svg",alt:"ESG"})
          ),
          h("div",null,
            h("div",{className:"brand-name",style:{fontSize:15}},step==="login"?"Willkommen zurück 👋":"Konto erstellen"),
            h("div",{className:"brand-sub",style:{fontSize:12}},step==="login"?"Bitte einloggen":"Elisabeth-Selbert-Gesamtschule")
          )
        ),

        error && h("div",{style:{background:"var(--st-high-bg,#fde8e8)",color:"var(--st-high,#c0392b)",
          padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,marginBottom:14}}, error),

        step === "login" && h("form",{className:"login-form",onSubmit:submit},
          h("div",{className:"field"},
            h("label",null,"Kürzel oder E-Mail"),
            h("input",{className:"input input-lg",type:"text",autoCapitalize:"none",autoComplete:"username",
              placeholder:"z. B. ca oder vorname.nachname@esg.nrw.schule",
              value:email,onChange:e=>setEmail(e.target.value),autoFocus:true}),
            h("div",{className:"field-hint",style:{marginTop:4}},"Erstpasswort: dein Nachname")
          ),
          h("div",{className:"field"},
            h("div",{className:"passrow"},
              h("label",null,"Passwort"),
              h("a",{href:"#",onClick:e=>{e.preventDefault();setStep("forgot")},className:"field-hint"},"Vergessen?")
            ),
            h("input",{className:"input input-lg",type:"password",placeholder:"••••••••",value:pass,onChange:e=>setPass(e.target.value)})
          ),
          h("button",{type:"submit",className:"btn btn-primary btn-lg btn-block",disabled:loading},
            loading ? h(Icon,{n:"activity",size:18,className:"spin"}) : null,
            loading ? "Anmelden…" : "Anmelden"
          ),
          h("button",{type:"button",className:"btn btn-outline btn-lg btn-block",onClick:demoLogin,style:{marginTop:-4}},
            "Demo-Modus — ohne Login starten →"
          ),
          h("div",{className:"login-alt"},"oder"),
          h("div",{className:"sso"},
            h("button",{type:"button",className:"btn btn-outline btn-lg btn-block",onClick:demoLogin},
              h("svg",{width:19,height:19,viewBox:"0 0 24 24",fill:"none"},
                h("path",{d:"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",fill:"#4285F4"}),
                h("path",{d:"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",fill:"#34A853"}),
                h("path",{d:"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z",fill:"#FBBC05"}),
                h("path",{d:"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",fill:"#EA4335"})
              ),
              "Mit Google anmelden"
            )
          ),
          h("div",{className:"login-switch"},
            "Noch kein Konto? ",
            h("button",{type:"button",onClick:()=>setStep("register")},"Registrieren")
          )
        ),

        step === "register" && h("form",{className:"login-form",onSubmit:submit},
          h("div",{className:"field"},
            h("label",null,"Vollständiger Name"),
            h("input",{className:"input input-lg",type:"text",placeholder:"Dr. Anke Brandt",value:name,onChange:e=>setName(e.target.value),autoFocus:true,required:true})
          ),
          h("div",{className:"field"},
            h("label",null,"Schul-E-Mail"),
            h("input",{className:"input input-lg",type:"email",placeholder:"name@esg-bonn.de",value:email,onChange:e=>setEmail(e.target.value),required:true})
          ),
          h("div",{className:"field"},
            h("label",null,"Passwort wählen"),
            h("input",{className:"input input-lg",type:"password",placeholder:"Mindestens 10 Zeichen",value:pass,onChange:e=>setPass(e.target.value),required:true})
          ),
          h("button",{type:"submit",className:"btn btn-primary btn-lg btn-block",disabled:loading},
            loading ? "Konto erstellen…" : "Konto erstellen"
          ),
          h("div",{className:"login-switch"},
            "Bereits registriert? ",
            h("button",{type:"button",onClick:()=>setStep("login")},"Anmelden")
          )
        ),

        step === "forgot" && h("div",null,
          h("h2",{className:"login-card",style:{padding:0}},"Passwort zurücksetzen"),
          h("p",{className:"sub",style:{marginTop:10}},"Gib deine Schul-E-Mail-Adresse ein, wir senden dir einen Link."),
          h("form",{className:"login-form",onSubmit:e=>{e.preventDefault();setStep("login")}},
            h("div",{className:"field"},
              h("label",null,"Schul-E-Mail"),
              h("input",{className:"input input-lg",type:"email",placeholder:"name@esg-bonn.de",autoFocus:true})
            ),
            h("button",{type:"submit",className:"btn btn-primary btn-lg btn-block"},"Link senden"),
            h("div",{className:"login-switch"},
              h("button",{type:"button",onClick:()=>setStep("login")},"← Zurück zum Login")
            )
          )
        )
      )
    )
  );
}

Object.assign(window,{LoginScreen});
})();
