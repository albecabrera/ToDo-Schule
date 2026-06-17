// app/bottom-nav.jsx — Bottom Navigation Bar for mobile
(function () {
"use strict";
const { useState, useEffect } = React;
const h = React.createElement;

const ITEMS = [
  { id: "tasks",       icon: "📝", label: "Aufgaben" },
  { id: "klasseliste", icon: "📋", label: "Klasse"   },
  { id: "chat",        icon: "💬", label: "Chat"      },
  { id: "notes",       icon: "🗒️", label: "Notizen"  },
];

function BottomNav() {
  const [active, setActive] = useState(
    () => window.ESG_CUR_S || "klasseliste"
  );
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    function onSection(e) {
      if (e.detail?.s) setActive(e.detail.s);
    }
    window.addEventListener("esg:section", onSection);

    function onChatUnread(e) {
      setChatUnread(e.detail?.count || 0);
    }
    window.addEventListener("esg:chat-unread", onChatUnread);

    return () => {
      window.removeEventListener("esg:section", onSection);
      window.removeEventListener("esg:chat-unread", onChatUnread);
    };
  }, []);

  function navigate(id) {
    if (window.ESG_SS) {
      window.ESG_SS(id);
      setActive(id);
    }
  }

  return h("nav", { className: "bn-bar", role: "navigation", "aria-label": "Navigation" },
    ITEMS.map(({ id, icon, label }) =>
      h("button", {
        key: id,
        className: `bn-item${active === id ? " on" : ""}`,
        onClick: () => navigate(id),
        "aria-label": label,
        "aria-current": active === id ? "page" : undefined,
      },
        h("span", { className: "bn-icon" }, icon),
        id === "chat" && chatUnread > 0 && h("span", { className: "bn-badge" }, chatUnread > 9 ? "9+" : chatUnread),
        h("span", null, label)
      )
    )
  );
}

const root = document.getElementById("bottom-nav-root");
if (root && window.ReactDOM) {
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(root).render(h(BottomNav, null));
  } else {
    ReactDOM.render(h(BottomNav, null), root);
  }
}
})();
