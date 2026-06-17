// app/calendar.jsx — ToDo-Schule Kalenderansicht
(function () {
"use strict";
const { useState, useEffect, useMemo } = React;
const h = React.createElement;

function apiFetch(path, opts = {}) {
  if (window.ESG_API && window.ESG_API.fetch) return window.ESG_API.fetch(path, opts);
  const base = window.ESG_API_BASE || "";
  const token = localStorage.getItem("accessToken") || "";
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  return fetch(base + path, { ...opts, headers }).then(r => r.json());
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS_DE = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember"
];

function toDateKey(iso) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function todayKey() {
  return toDateKey(new Date().toISOString());
}

function taskDotColor(task, dayKey) {
  if (task.status === "done") return "#16a34a";
  const today = todayKey();
  if (dayKey < today) return "#dc2626";
  if (dayKey === today) return "#f59e0b";
  return "#4f46e5";
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year, month) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function fmtLong(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}

function DayCell({ day, dayKey, tasks, isToday, isSelected, onSelect }) {
  const dots = tasks.slice(0, 4);
  return h("button", {
    className: [
      "cal-day",
      isToday    ? "cal-day--today"    : "",
      isSelected ? "cal-day--selected" : "",
      tasks.length > 0 ? "cal-day--has-events" : "",
    ].filter(Boolean).join(" "),
    onClick: () => onSelect(dayKey),
  },
    h("span", { className: "cal-day-num" }, day),
    dots.length > 0 && h("div", { className: "cal-dots" },
      dots.map((t, i) =>
        h("span", { key: i, className: "cal-dot", style: { background: taskDotColor(t, dayKey) } })
      ),
      tasks.length > 4 && h("span", { className: "cal-dot-more" }, `+${tasks.length - 4}`)
    )
  );
}

function EventList({ dayKey, tasks }) {
  if (!dayKey) return h("div", { className: "cal-events cal-events--empty" },
    h("p", { className: "cal-events-hint" }, "Tag anklicken, um Aufgaben zu sehen.")
  );

  return h("div", { className: "cal-events" },
    h("div", { className: "cal-events-header" },
      h("span", { className: "cal-events-date" }, fmtLong(dayKey))
    ),
    tasks.length === 0
      ? h("div", { className: "cal-events-none" },
          h("span", { className: "cal-events-none-icon" }, "✅"),
          h("p", null, "Keine Aufgaben an diesem Tag.")
        )
      : h("ul", { className: "cal-event-list" },
          tasks.map(t =>
            h("li", { key: t.id, className: `cal-event-item cal-event-item--${t.status || "open"}` },
              h("span", { className: "cal-event-dot", style: { background: taskDotColor(t, dayKey) } }),
              h("div", { className: "cal-event-info" },
                h("span", { className: "cal-event-title" }, t.title),
                t.team_name && h("span", { className: "cal-event-team" }, t.team_name)
              ),
              t.status === "done" && h("span", { className: "cal-event-done" }, "✓")
            )
          )
        )
  );
}

function CalendarView() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(todayKey());

  useEffect(() => {
    apiFetch("/api/tasks")
      .then(d => setTasks(d.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const k = toDateKey(t.due_date);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [tasks]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    const n = new Date();
    setYear(n.getFullYear()); setMonth(n.getMonth()); setSelected(todayKey());
  }

  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const today        = todayKey();
  const monthPrefix  = `${year}-${String(month + 1).padStart(2, "0")}`;

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${monthPrefix}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key: k });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTasks  = selected ? (tasksByDay[selected] || []) : [];
  const monthHasTasks  = Object.keys(tasksByDay).some(k => k.startsWith(monthPrefix));

  return h("div", { className: "cal-screen" },
    h("div", { className: "cal-main" },

      h("div", { className: "cal-panel" },
        h("div", { className: "cal-nav" },
          h("button", { className: "cal-nav-btn", onClick: prevMonth }, "‹"),
          h("h2", { className: "cal-month-title" }, `${MONTHS_DE[month]} ${year}`),
          h("button", { className: "cal-nav-btn", onClick: nextMonth }, "›"),
          h("button", { className: "cal-today-btn btn btn-soft btn-sm", onClick: goToday }, "Heute")
        ),

        h("div", { className: "cal-grid" },
          WEEKDAYS.map(w => h("div", { key: w, className: "cal-weekday" }, w)),
          cells.map((cell, i) =>
            cell === null
              ? h("div", { key: `e${i}`, className: "cal-day cal-day--empty" })
              : h(DayCell, {
                  key: cell.key,
                  day: cell.day,
                  dayKey: cell.key,
                  tasks: tasksByDay[cell.key] || [],
                  isToday: cell.key === today,
                  isSelected: cell.key === selected,
                  onSelect: k => setSelected(k === selected ? null : k),
                })
          )
        ),

        loading && h("div", { className: "cal-loading" }, "Wird geladen…"),
        !loading && !monthHasTasks && h("p", { className: "cal-empty-hint" },
          "Keine Aufgaben mit Fälligkeit in diesem Monat."
        ),

        h("div", { className: "cal-legend" },
          h("span", { className: "cal-legend-item" }, h("span", { className: "cal-dot", style:{background:"#16a34a"} }), "Erledigt"),
          h("span", { className: "cal-legend-item" }, h("span", { className: "cal-dot", style:{background:"#f59e0b"} }), "Heute"),
          h("span", { className: "cal-legend-item" }, h("span", { className: "cal-dot", style:{background:"#dc2626"} }), "Überfällig"),
          h("span", { className: "cal-legend-item" }, h("span", { className: "cal-dot", style:{background:"#4f46e5"} }), "Ausstehend")
        )
      ),

      h(EventList, { dayKey: selected, tasks: selectedTasks })
    )
  );
}

window.CalendarView = CalendarView;
})();
