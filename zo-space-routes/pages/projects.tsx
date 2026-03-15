import { useState, useEffect } from "react";

// ============================================================================
// Projects — Track project progress with task breakdowns
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

export default function Projects() {
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const projects = data.projects || [];
  const tasks = data.tasks || [];
  const documents = data.documents || [];

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/projects" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F4CA}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Projects</h1>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Projects", value: projects.length, icon: "\u{1F4C1}" },
          { label: "Active", value: projects.filter((p: any) => p.status === "active").length, icon: "\u{1F7E2}" },
          { label: "Complete", value: projects.filter((p: any) => p.status === "complete").length, icon: "\u{2705}" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Project Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {projects.map((p: any) => {
          const projectTasks = tasks.filter((t: any) => t.project === p.name);
          const isExpanded = expanded === p.id;
          const deadline = new Date(p.deadline);
          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const isComplete = p.status === "complete" || p.progress === 100;
          const projectDocs = documents.filter((d: any) => p.documents.includes(d.name));

          // Agent involvement
          const involvedAgents = [...new Set(projectTasks.map((t: any) => t.assignee).filter(Boolean))];

          return (
            <div key={p.id} style={{ background: "#18181b", border: `1px solid ${p.status === "complete" ? "#166534" : "#27272a"}`, borderRadius: 12, overflow: "hidden" }}>
              {/* Header */}
              <div
                style={{ padding: 20, cursor: "pointer" }}
                onClick={() => setExpanded(isExpanded ? null : p.id)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{p.status === "complete" ? "\u{2705}" : "\u{1F4C2}"}</span>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: isComplete ? "#4ade80" : daysLeft <= 0 ? "#ef4444" : daysLeft <= 5 ? "#fbbf24" : "#a1a1aa" }}>
                      {isComplete ? "Complete!" : daysLeft <= 0 ? "Overdue!" : `${daysLeft} days left`}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: p.status === "complete" ? "#4ade80" : "#3b82f6" }}>{p.progress}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ background: "#27272a", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ background: p.status === "complete" ? "#4ade80" : "#3b82f6", height: "100%", width: `${p.progress}%`, borderRadius: 6, transition: "width 0.3s" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#71717a" }}>
                  <span>{p.tasks_complete}/{p.tasks_total} tasks complete</span>
                  <span>Deadline: {p.deadline}</span>
                  <span>{isExpanded ? "\u25B2" : "\u25BC"} Details</span>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #27272a", padding: 20 }}>
                  {/* Agents */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 8 }}>Assigned Agents</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {involvedAgents.length > 0 ? involvedAgents.map((name: string) => {
                        const agent = (data.agents || []).find((a: any) => a.name === name);
                        return (
                          <span key={name} style={{ display: "flex", alignItems: "center", gap: 4, background: "#27272a", padding: "4px 10px", borderRadius: 6, fontSize: 12 }}>
                            {agent?.emoji || "\u{1F916}"} {name}
                          </span>
                        );
                      }) : <span style={{ fontSize: 12, color: "#52525b" }}>No agents assigned</span>}
                    </div>
                  </div>

                  {/* Tasks Breakdown */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 8 }}>Tasks</div>
                    {projectTasks.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {projectTasks.map((t: any) => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#09090b", borderRadius: 6 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: t.status === "done" ? "#4ade80" : t.status === "in_progress" ? "#fbbf24" : t.status === "review" ? "#c084fc" : "#71717a",
                            }} />
                            <span style={{ fontSize: 13, flex: 1 }}>{t.title}</span>
                            <span style={{ fontSize: 11, color: "#52525b" }}>{t.assignee || "Unassigned"}</span>
                            <span style={{ fontSize: 11, color: "#52525b" }}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 12, color: "#52525b" }}>No tasks linked</span>}
                  </div>

                  {/* Documents */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 8 }}>Documents</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {projectDocs.length > 0 ? projectDocs.map((d: any) => (
                        <span key={d.id} style={{ fontSize: 12, background: "#1e1b4b", color: "#a5b4fc", padding: "4px 10px", borderRadius: 6 }}>
                          {"\u{1F4C4}"} {d.name}
                        </span>
                      )) : p.documents.map((name: string) => (
                        <span key={name} style={{ fontSize: 12, background: "#1e1b4b", color: "#a5b4fc", padding: "4px 10px", borderRadius: 6 }}>
                          {"\u{1F4C4}"} {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
