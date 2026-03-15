import { useState, useEffect, useRef } from "react";

// ============================================================================
// Global Search — Search across ALL data
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

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  agent: { bg: "#2e1065", text: "#c084fc", icon: "\u{1F916}" },
  project: { bg: "#052e16", text: "#4ade80", icon: "\u{1F4CA}" },
  memory: { bg: "#042f2e", text: "#2dd4bf", icon: "\u{1F9E0}" },
  task: { bg: "#1e3a5f", text: "#60a5fa", icon: "\u{2705}" },
  document: { bg: "#1e1b4b", text: "#a5b4fc", icon: "\u{1F4C4}" },
  activity: { bg: "#3b1f0b", text: "#fb923c", icon: "\u{26A1}" },
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function doSearch(q: string) {
    setSearching(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "global_search", query: q }),
      });
      const json = await res.json();
      setResults(json.results || []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }

  const tabs = ["all", "agent", "project", "memory", "task", "document", "activity"];
  const filtered = activeTab === "all" ? results : results.filter((r) => r.type === activeTab);

  function highlightMatch(text: string, q: string) {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ background: "#854d0e", color: "#fef08a", borderRadius: 2, padding: "0 2px" }}>{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/search" />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32, marginTop: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>{"\u{1F50D}"} Global Search</h1>
          <p style={{ fontSize: 14, color: "#71717a", margin: 0 }}>Search across all memories, tasks, documents, and activities</p>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            autoFocus
            style={{
              width: "100%",
              background: "#18181b",
              color: "#f4f4f5",
              border: "2px solid #3f3f46",
              borderRadius: 12,
              padding: "16px 20px",
              fontSize: 16,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searching && (
            <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#71717a" }}>Searching...</span>
          )}
        </div>

        {/* Tabs */}
        {results.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {tabs.map((tab) => {
              const count = tab === "all" ? results.length : results.filter((r) => r.type === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? "#f4f4f5" : "#a1a1aa",
                    background: activeTab === tab ? "#27272a" : "transparent",
                  }}
                >
                  {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {count > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "#71717a" }}>({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Results */}
        {query && !searching && results.length === 0 && (
          <div style={{ textAlign: "center", color: "#52525b", padding: 40, fontSize: 14 }}>
            No results found for "{query}"
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r: any) => {
            const style = TYPE_STYLES[r.type] || { bg: "#27272a", text: "#a1a1aa", icon: "\u{1F4CB}" };
            return (
              <div key={`${r.type}-${r.id}`} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{style.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: style.text, background: style.bg, padding: "2px 10px", borderRadius: 4 }}>
                    {r.type}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{highlightMatch(r.title, query)}</span>
                  <span style={{ fontSize: 11, color: "#52525b", marginLeft: "auto" }}>{r.agent}</span>
                </div>
                <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.5 }}>
                  {highlightMatch(r.content.length > 200 ? r.content.slice(0, 200) + "..." : r.content, query)}
                </div>
                <div style={{ fontSize: 11, color: "#52525b", marginTop: 6 }}>
                  {new Date(r.timestamp).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!query && (
          <div style={{ textAlign: "center", color: "#3f3f46", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u{1F50E}"}</div>
            <div style={{ fontSize: 16 }}>Search across all memories, tasks, documents, and activities</div>
            <div style={{ fontSize: 13, marginTop: 8, color: "#52525b" }}>Try: "research", "agent", "mission control", "bug fix"</div>
          </div>
        )}
      </div>
    </div>
  );
}
