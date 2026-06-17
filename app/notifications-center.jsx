// app/notifications-center.jsx — Benachrichtigungen-Zentrum
(function () {
"use strict";
const { useState, useEffect, useCallback } = React;
const h = React.createElement;

function apiFetch(path, opts = {}) {
  if (window.ESG_API && window.ESG_API.fetch) return window.ESG_API.fetch(path, opts);
  const base = window.ESG_API_BASE || "";
  const token = localStorage.getItem("accessToken") || "";
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  return fetch(base + path, { ...opts, headers }).then(r => r.json());
}

const TYPE_ICON = {
  "user:assigned":      "👤",
  "comment:added":      "💬",
  "chat:message":       "💬",
  "chat:mention":       "🔔",
  "klasseliste:updated":"📋",
  "note:created":       "🗒️",
};

function relTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "gerade eben";
  if (diff < 3600)  return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 172800)return "gestern";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long" });
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Heute";
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDay(notifications) {
  const groups = [];
  let lastLabel = null;
  for (const n of notifications) {
    const label = dayLabel(n.created_at);
    if (label !== lastLabel) {
      groups.push({ label, items: [] });
      lastLabel = label;
    }
    groups[groups.length - 1].items.push(n);
  }
  return groups;
}

function NotificationsView() {
  const [items, setItems]     = useState([]);
  const [filter, setFilter]   = useState("all"); // "all" | "unread"
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiFetch("/api/notifications")
      .then(data => {
        const list = Array.isArray(data) ? data : (data.notifications || []);
        setItems(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  function markRead(id) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    apiFetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
    apiFetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  function handleClick(n) {
    if (!n.is_read) markRead(n.id);
    if (n.task_id) {
      window.dispatchEvent(new CustomEvent("esg:open-task", { detail: { id: n.task_id } }));
    }
  }

  const visible  = filter === "unread" ? items.filter(n => !n.is_read) : items;
  const unreadCount = items.filter(n => !n.is_read).length;
  const groups   = groupByDay(visible);

  return h("div", { className: "nc-screen" },

    h("div", { className: "nc-header" },
      h("h2", { className: "nc-title" }, "🔔 Benachrichtigungen"),
      unreadCount > 0 && h("button", {
        className: "nc-read-all",
        onClick: markAllRead,
      }, `Alle lesen (${unreadCount})`)
    ),

    h("div", { className: "nc-tabs" },
      h("button", {
        className: `nc-tab${filter === "all" ? " on" : ""}`,
        onClick: () => setFilter("all"),
      }, "Alle"),
      h("button", {
        className: `nc-tab${filter === "unread" ? " on" : ""}`,
        onClick: () => setFilter("unread"),
      },
        "Ungelesen",
        unreadCount > 0 && h("span", { className: "nc-badge" }, unreadCount)
      )
    ),

    loading
      ? h("div", { className: "nc-loading" }, h("div", { className: "nc-spinner" }))
      : visible.length === 0
        ? h("div", { className: "nc-empty" },
            h("div", { className: "nc-empty-icon" }, "🎉"),
            h("p", null, filter === "unread" ? "Alle gelesen!" : "Keine Benachrichtigungen")
          )
        : h("div", { className: "nc-list" },
            groups.map(({ label, items: groupItems }) =>
              h("div", { key: label, className: "nc-group" },
                h("div", { className: "nc-day-label" }, label),
                groupItems.map(n =>
                  h("div", {
                    key: n.id,
                    className: `nc-card${n.is_read ? "" : " unread"}`,
                    onClick: () => handleClick(n),
                    role: "button",
                    tabIndex: 0,
                    onKeyDown: e => e.key === "Enter" && handleClick(n),
                  },
                    h("span", { className: "nc-icon" }, TYPE_ICON[n.type] || "🔔"),
                    h("div", { className: "nc-card-body" },
                      h("p", { className: "nc-text" }, n.text),
                      h("span", { className: "nc-time" }, relTime(n.created_at))
                    ),
                    !n.is_read && h("div", { className: "nc-dot" })
                  )
                )
              )
            )
          )
  );
}

window.NotificationsView = NotificationsView;
})();
