import { useState, useEffect } from "react";

// ============================================================================
// Memories — Browse and search agent memory entries
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

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  research: { bg: "#1e3a5f", text: "#60a5fa" },
  build_check: { bg: "#3b1f0b", text: "#fb923c" },
  bug_fix: { bg: "#4c0519", text: "#fb7185" },
  schedule_check: { bg: "#1c1917", text: "#a8a29e" },
  task_complete: { bg: "#052e16", text: "#4ade80" },
  memory_consolidation: { bg: "#042f2e", text: "#2dd4bf" },
  documentation: { bg: "#1e1b4b", text: "#a5b4fc" },
  comm_check: { bg: "#172554", text: "#93c5fd" },
  deadline_reminder: { bg: "#451a03", text: "#fbbf24" },
};

export default function Memories() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterType, setFilterType] = useState("all");

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
      setError(null);
    } catch { setError("Failed to load data"); }
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif", flexDirection: "column", gap: 12 }}>
        {error ? (
          <>
            <span style={{ color: "#ef4444" }}>{error}</span>
            <button onClick={() => { setError(null); fetchData(); }} style={{ background: "#27272a", color: "#f4f4f5", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>Retry</button>
          </>
        ) : "Loading..."}
      </div>
    );
  }

  const memories = data.memories || [];
  const agents = data.agents || [];
  const allTypes = [...new Set(memories.map((m: any) => m.type))];

  const filtered = memories.filter((m: any) => {
    if (filterAgent !== "all" && m.agent !== filterAgent) return false;
    if (filterType !== "all" && m.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.content.toLowerCase().includes(q) || m.tags.some((t: string) => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/memories" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F9E0}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Memories</h1>
        <span style={{ fontSize: 13, color: "#71717a" }}>{memories.length} total</span>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          style={{ flex: 1, minWidth: 250, background: "#18181b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" }}
        />
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} style={{ background: "#18181b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="all">All Agents</option>
          {agents.map((a: any) => <option key={a.id} value={a.name}>{a.emoji} {a.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ background: "#18181b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
          <option value="all">All Types</option>
          {allTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "#71717a" }}>{filtered.length} results</span>
      </div>

      {/* Memory Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((m: any) => {
          const tc = TYPE_COLORS[m.type] || { bg: "#27272a", text: "#a1a1aa" };
          return (
            <div key={m.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 16, position: "relative" }}>
              <button
                onClick={async () => {
                  if (!window.confirm("Delete this memory?")) return;
                  try {
                    await fetch("/api/data", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "delete_memory", memory_id: m.id }),
                    });
                    fetchData();
                  } catch {}
                }}
                style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", color: "#71717a", fontSize: 14, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
                title="Delete memory"
              >
                ×
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: tc.text, background: tc.bg, padding: "2px 10px", borderRadius: 4 }}>{m.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.agent}</span>
                <span style={{ fontSize: 11, color: "#52525b", marginLeft: "auto" }}>{new Date(m.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.6, marginBottom: 10 }}>{m.content}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {m.tags.map((t: string) => (
                  <span key={t} style={{ fontSize: 10, color: "#71717a", background: "#27272a", padding: "2px 8px", borderRadius: 4 }}>#{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
