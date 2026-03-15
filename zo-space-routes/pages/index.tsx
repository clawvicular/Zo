import { useState, useEffect } from "react";

// ============================================================================
// Mission Control — Dashboard with Mission Statement
// ============================================================================

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
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
        <a
          key={item.href}
          href={item.href}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: current === item.href ? 600 : 400,
            color: current === item.href ? "#f4f4f5" : "#a1a1aa",
            background: current === item.href ? "#27272a" : "transparent",
            textDecoration: "none",
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [editingMission, setEditingMission] = useState(false);
  const [missionDraft, setMissionDraft] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      setData(json);
    } catch {}
  }

  async function saveMission() {
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_mission", mission: missionDraft }),
      });
      setEditingMission(false);
      fetchData();
    } catch {}
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Loading Mission Control...
      </div>
    );
  }

  const stats = data.stats || {};

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F680}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Mission Control</h1>
        <span style={{ fontSize: 13, color: "#71717a", marginLeft: "auto" }}>lora.zo.space</span>
      </div>

      {/* Mission Statement Banner */}
      <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>{"\u{1F3AF}"}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", textTransform: "uppercase", letterSpacing: 1 }}>Mission Statement</span>
          {!editingMission && (
            <button
              onClick={() => { setMissionDraft(data.mission); setEditingMission(true); }}
              style={{ marginLeft: "auto", background: "transparent", border: "1px solid #166534", color: "#4ade80", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}
            >
              Edit
            </button>
          )}
        </div>
        {editingMission ? (
          <div>
            <textarea
              value={missionDraft}
              onChange={(e) => setMissionDraft(e.target.value)}
              style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #166534", borderRadius: 8, padding: 12, fontSize: 15, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={saveMission} style={{ background: "#166534", color: "#f4f4f5", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>Save</button>
              <button onClick={() => setEditingMission(false)} style={{ background: "transparent", color: "#a1a1aa", border: "1px solid #3f3f46", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#bbf7d0" }}>{data.mission}</p>
        )}
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Agents", value: stats.active_agents, icon: "\u{1F916}" },
          { label: "Tasks In Progress", value: stats.tasks_in_progress, icon: "\u{26A1}" },
          { label: "Total Memories", value: stats.total_memories, icon: "\u{1F9E0}" },
          { label: "Active Projects", value: stats.active_projects, icon: "\u{1F4CA}" },
          { label: "Activities Today", value: data.activities?.filter((a: any) => a.timestamp?.startsWith("2026-03-15")).length || 0, icon: "\u{1F4C8}" },
          { label: "Tokens Today", value: (stats.tokens_today || 0).toLocaleString(), icon: "\u{1F4B0}" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Agent Status Grid */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#a1a1aa" }}>Agent Status</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
        {(data.agents || []).map((agent: any) => (
          <div key={agent.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 16, opacity: agent.status === "paused" ? 0.5 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{agent.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{agent.name}</div>
                <div style={{ fontSize: 12, color: "#71717a" }}>{agent.role}</div>
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: agent.status === "active" ? "#4ade80" : agent.status === "paused" ? "#facc15" : "#ef4444",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a1a1aa" }}>
              <span>{agent.tasks_active} active</span>
              <span>{agent.tasks_completed} done</span>
            </div>
            <div style={{ fontSize: 11, color: "#52525b", marginTop: 6 }}>Last active: {agent.last_active}</div>
          </div>
        ))}
      </div>

      {/* Two-Column: Recent Activity + Active Projects */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Recent Activity */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa", margin: 0 }}>Recent Activity</h2>
            <a href="/activity" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>View all {"\u2192"}</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(data.activities || []).slice(0, 8).map((a: any) => (
              <div key={a.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", background: "#1e3a5f", padding: "2px 8px", borderRadius: 4 }}>{a.action}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{a.agent}</span>
                  <span style={{ fontSize: 11, color: "#52525b", marginLeft: "auto" }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.4 }}>{a.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Projects */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#a1a1aa", marginBottom: 12 }}>Active Projects</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(data.projects || []).map((p: any) => (
              <div key={p.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: p.status === "complete" ? "#4ade80" : "#facc15" }}>{p.progress}%</span>
                </div>
                <div style={{ background: "#27272a", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ background: p.status === "complete" ? "#4ade80" : "#3b82f6", height: "100%", width: `${p.progress}%`, borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#71717a" }}>
                  <span>{p.tasks_complete}/{p.tasks_total} tasks</span>
                  <span>Due: {p.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
