import { useState, useEffect } from "react";

// ============================================================================
// Activity Feed — Real-time log of everything agents do
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

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  research: { bg: "#1e3a5f", text: "#60a5fa" },
  build: { bg: "#3b1f0b", text: "#fb923c" },
  deploy: { bg: "#1a2e05", text: "#84cc16" },
  bug_fix: { bg: "#4c0519", text: "#fb7185" },
  schedule_check: { bg: "#1c1917", text: "#a8a29e" },
  deadline_reminder: { bg: "#451a03", text: "#fbbf24" },
  delegate: { bg: "#2e1065", text: "#a78bfa" },
  consolidate: { bg: "#042f2e", text: "#2dd4bf" },
  memory_write: { bg: "#042f2e", text: "#2dd4bf" },
  status_update: { bg: "#172554", text: "#93c5fd" },
  documentation: { bg: "#1e1b4b", text: "#a5b4fc" },
  plan: { bg: "#2e1065", text: "#c084fc" },
  task_complete: { bg: "#052e16", text: "#4ade80" },
};

function getActionColor(action: string) {
  return ACTION_COLORS[action] || { bg: "#27272a", text: "#a1a1aa" };
}

export default function ActivityFeed() {
  const [data, setData] = useState<any>(null);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

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

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Loading...
      </div>
    );
  }

  const activities = data.activities || [];
  const agents = data.agents || [];
  const allActions = [...new Set(activities.map((a: any) => a.action))];

  const filtered = activities.filter((a: any) => {
    if (filterAgent !== "all" && a.agent !== filterAgent) return false;
    if (filterAction !== "all" && a.action !== filterAction) return false;
    return true;
  });

  const todayCount = activities.filter((a: any) => a.timestamp?.startsWith(new Date().toISOString().split("T")[0])).length;
  const totalTokens = activities.reduce((s: number, a: any) => s + (a.tokens_used || 0), 0);
  const agentCounts: Record<string, number> = {};
  activities.forEach((a: any) => { agentCounts[a.agent] = (agentCounts[a.agent] || 0) + 1; });
  const mostActive = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/activity" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F4CB}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Activity Feed</h1>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Today", value: todayCount, icon: "\u{1F4C5}" },
          { label: "Total Activities", value: activities.length, icon: "\u{1F4CA}" },
          { label: "Most Active", value: mostActive ? mostActive[0] : "-", icon: "\u{1F3C6}" },
          { label: "Tokens Used", value: totalTokens.toLocaleString(), icon: "\u{1F4B0}" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          style={{ background: "#18181b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}
        >
          <option value="all">All Agents</option>
          {agents.map((a: any) => <option key={a.id} value={a.name}>{a.emoji} {a.name}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ background: "#18181b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}
        >
          <option value="all">All Actions</option>
          {allActions.map((a: string) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ fontSize: 13, color: "#71717a", display: "flex", alignItems: "center" }}>{filtered.length} activities</span>
      </div>

      {/* Activity Stream */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((a: any, i: number) => {
          const color = getActionColor(a.action);
          return (
            <div
              key={a.id}
              style={{
                background: i === 0 ? "#1a1a2e" : "#18181b",
                border: `1px solid ${i === 0 ? "#27275a" : "#27272a"}`,
                borderRadius: 8,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 11, color: "#52525b", minWidth: 70, paddingTop: 2 }}>
                {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 100 }}>{a.agent}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: color.text, background: color.bg, padding: "2px 10px", borderRadius: 4, minWidth: 90, textAlign: "center" }}>
                {a.action}
              </span>
              <span style={{ fontSize: 13, color: "#a1a1aa", flex: 1, lineHeight: 1.4 }}>{a.detail}</span>
              {a.tokens_used > 0 && (
                <span style={{ fontSize: 11, color: "#52525b", minWidth: 60, textAlign: "right" }}>{a.tokens_used.toLocaleString()} tok</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
