import { useState, useEffect } from "react";

// ============================================================================
// Calendar — Schedule, cron jobs, and deadlines
// ============================================================================

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Henry", href: "/henry" },
  { label: "Activity", href: "/activity" },
  { label: "Tasks", href: "/tasks" },
  { label: "Memories", href: "/memories" },
  { label: "Team", href: "/team" },
  { label: "Calendar", href: "/calendar" },
  { label: "Projects", href: "/projects" },
  { label: "Search", href: "/search" },
  { label: "AutoResearch", href: "/autoresearch" },
];

function Nav({ current }: { current: string }) {
  return (
    <nav style={{ display: "flex", gap: 4, padding: "12px 0", borderBottom: "1px solid #27272a", marginBottom: 24, flexWrap: "wrap" }}>
      {NAV_ITEMS.map((item) => (
        <a key={item.href} href={item.href} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: current === item.href ? 600 : 400, color: current === item.href ? "#f4f4f5" : "#a1a1aa", background: current === item.href ? "#27272a" : "transparent", textDecoration: "none" }}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar() {
  const [data, setData] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(2); // March (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      setData(json);
    } catch {}
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Loading...
      </div>
    );
  }

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const now = new Date();
  const todayDay = now.getDate();
  const isCurrentMonthYear = now.getMonth() === currentMonth && now.getFullYear() === currentYear;

  // Collect events per day
  const deadlines: Record<number, string[]> = {};
  (data.projects || []).forEach((p: any) => {
    const d = new Date(p.deadline);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      const day = d.getDate();
      if (!deadlines[day]) deadlines[day] = [];
      deadlines[day].push(`${p.name} due`);
    }
  });

  // Activity dots per day
  const activityDays: Record<number, number> = {};
  (data.activities || []).forEach((a: any) => {
    const d = new Date(a.timestamp);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      const day = d.getDate();
      activityDays[day] = (activityDays[day] || 0) + 1;
    }
  });

  const schedule = data.schedule || [];

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/calendar" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F4C5}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Calendar</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* Month View */}
        <div>
          {/* Month Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }} style={{ background: "#27272a", color: "#f4f4f5", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 14 }}>{"\u2190"}</button>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{MONTHS[currentMonth]} {currentYear}</span>
            <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }} style={{ background: "#27272a", color: "#f4f4f5", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 14 }}>{"\u2192"}</button>
          </div>

          {/* Day Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, color: "#52525b", padding: 8 }}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 80 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = isCurrentMonthYear && day === todayDay;
              const hasDeadline = deadlines[day];
              const actCount = activityDays[day] || 0;

              return (
                <div
                  key={day}
                  style={{
                    minHeight: 80,
                    background: isToday ? "#1a1a2e" : "#18181b",
                    border: `1px solid ${isToday ? "#3b82f6" : "#27272a"}`,
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#3b82f6" : "#a1a1aa" }}>{day}</span>
                    {actCount > 0 && (
                      <span style={{ fontSize: 10, color: "#52525b" }}>{actCount} act</span>
                    )}
                  </div>
                  {hasDeadline && hasDeadline.map((d, idx) => (
                    <div key={idx} style={{ fontSize: 10, color: "#ef4444", background: "#4c0519", padding: "2px 6px", borderRadius: 3, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar — Scheduled Jobs + Upcoming */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa", marginBottom: 12 }}>{"\u{23F0}"} Scheduled Jobs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
            {schedule.map((s: any) => (
              <div key={s.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.agent}</span>
                  <span style={{ fontSize: 10, color: "#3b82f6", background: "#1e3a5f", padding: "2px 6px", borderRadius: 3 }}>{s.cron}</span>
                </div>
                <div style={{ fontSize: 13, color: "#d4d4d8", marginBottom: 4 }}>{s.task}</div>
                <div style={{ fontSize: 11, color: "#52525b" }}>
                  Next: {s.next_run === "-" ? "Paused" : new Date(s.next_run).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa", marginBottom: 12 }}>{"\u{1F4CC}"} Project Deadlines</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data.projects || []).map((p: any) => {
              const deadline = new Date(p.deadline);
              const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isComplete = p.status === "complete" || p.progress === 100;
              return (
                <div key={p.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#71717a" }}>
                    <span>{p.deadline}</span>
                    <span style={{ color: isComplete ? "#4ade80" : daysLeft <= 0 ? "#ef4444" : daysLeft <= 5 ? "#fbbf24" : "#a1a1aa" }}>
                      {isComplete ? "Complete!" : daysLeft <= 0 ? "Overdue!" : `${daysLeft} days left`}
                    </span>
                  </div>
                  <div style={{ background: "#27272a", borderRadius: 4, height: 4, overflow: "hidden", marginTop: 6 }}>
                    <div style={{ background: p.progress === 100 ? "#4ade80" : "#3b82f6", height: "100%", width: `${p.progress}%`, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
