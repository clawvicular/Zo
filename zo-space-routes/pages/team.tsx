import { useState, useEffect } from "react";

// ============================================================================
// Team Structure + Digital Office — Org chart + visual workspace
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

export default function Team() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"org" | "office">("org");
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editSchedule, setEditSchedule] = useState("");

  function startEditing(agent: any) {
    setEditingAgent(agent.id);
    setEditStatus(agent.status || "active");
    setEditSchedule(agent.schedule || "");
  }

  function cancelEditing() {
    setEditingAgent(null);
    setEditStatus("");
    setEditSchedule("");
  }

  async function saveAgent() {
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_agent", agent_id: editingAgent, status: editStatus, schedule: editSchedule }),
      });
      setEditingAgent(null);
      fetchData();
    } catch { setError("Failed to save agent"); }
  }

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

  const agents = data.agents || [];
  const henry = agents.find((a: any) => a.id === "henry");
  const subAgents = agents.filter((a: any) => a.id !== "henry");

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/team" />

      {/* Header + View Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F465}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Team</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "#18181b", borderRadius: 8, padding: 4 }}>
          <button
            onClick={() => setView("org")}
            style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer", fontWeight: view === "org" ? 600 : 400, color: view === "org" ? "#f4f4f5" : "#a1a1aa", background: view === "org" ? "#27272a" : "transparent" }}
          >
            Org Chart
          </button>
          <button
            onClick={() => setView("office")}
            style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer", fontWeight: view === "office" ? 600 : 400, color: view === "office" ? "#f4f4f5" : "#a1a1aa", background: view === "office" ? "#27272a" : "transparent" }}
          >
            Digital Office
          </button>
        </div>
      </div>

      {/* Mission Statement (read-only) */}
      <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14 }}>{"\u{1F3AF}"}</span>
        <span style={{ fontSize: 14, color: "#bbf7d0", flex: 1 }}>{data.mission}</span>
        <a href="/" style={{ fontSize: 12, color: "#4ade80", textDecoration: "none" }}>Edit {"\u2192"}</a>
      </div>

      {view === "org" ? (
        /* ORG CHART VIEW */
        <div>
          {/* Henry — Orchestrator at Top */}
          {henry && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
              <div style={{
                background: "linear-gradient(135deg, #1e1b4b, #312e81)",
                border: "2px solid #6366f1",
                borderRadius: 16,
                padding: 24,
                width: 320,
                textAlign: "center",
                boxShadow: "0 0 30px rgba(99, 102, 241, 0.15)",
              }}>
                <span style={{ fontSize: 40 }}>{henry.emoji}</span>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{henry.name}</div>
                <div style={{ fontSize: 13, color: "#a5b4fc", marginBottom: 8 }}>{henry.role}</div>
                <div style={{ fontSize: 12, color: "#818cf8", marginBottom: 12 }}>{henry.model}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
                  {henry.capabilities.map((c: string) => (
                    <span key={c} style={{ fontSize: 11, background: "#312e81", color: "#c7d2fe", padding: "2px 8px", borderRadius: 4 }}>{c}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "#a1a1aa" }}>
                  <span>{henry.tasks_active} active</span>
                  <span>{henry.tasks_completed} completed</span>
                </div>
              </div>
              {/* Connection Line */}
              <div style={{ width: 2, height: 32, background: "#3f3f46" }} />
              <div style={{ width: Math.min(subAgents.length * 140, 800), height: 2, background: "#3f3f46" }} />
            </div>
          )}

          {/* Sub-Agents Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {subAgents.map((agent: any) => (
              <div
                key={agent.id}
                style={{
                  background: "#18181b",
                  border: `1px solid ${agent.status === "active" ? "#27272a" : "#1f1f23"}`,
                  borderRadius: 12,
                  padding: 20,
                  opacity: agent.status === "paused" ? 0.5 : 1,
                }}
              >
                {editingAgent === agent.id ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 32 }}>{agent.emoji}</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</div>
                        <div style={{ fontSize: 12, color: "#71717a" }}>{agent.role}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #27272a", borderRadius: 6, padding: "6px 8px", fontSize: 12, outline: "none" }}
                      >
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="error">error</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Schedule</label>
                      <input
                        type="text"
                        value={editSchedule}
                        onChange={(e) => setEditSchedule(e.target.value)}
                        style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #27272a", borderRadius: 6, padding: "6px 8px", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveAgent} style={{ flex: 1, background: "#27272a", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Save</button>
                      <button onClick={cancelEditing} style={{ flex: 1, background: "transparent", color: "#a1a1aa", border: "1px solid #27272a", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 32 }}>{agent.emoji}</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</div>
                        <div style={{ fontSize: 12, color: "#71717a" }}>{agent.role}</div>
                      </div>
                      <span style={{ marginLeft: "auto", width: 10, height: 10, borderRadius: "50%", background: agent.status === "active" ? "#4ade80" : agent.status === "paused" ? "#facc15" : "#ef4444" }} />
                    </div>

                    <div style={{ fontSize: 12, color: "#71717a", marginBottom: 8 }}>{agent.model}</div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {agent.capabilities.map((c: string) => (
                        <span key={c} style={{ fontSize: 10, background: "#27272a", color: "#a1a1aa", padding: "2px 8px", borderRadius: 4 }}>{c}</span>
                      ))}
                    </div>

                    <div style={{ fontSize: 12, color: "#52525b", marginBottom: 4 }}>Schedule: {agent.schedule}</div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#a1a1aa", paddingTop: 8, borderTop: "1px solid #27272a" }}>
                      <span>{agent.tasks_active} active</span>
                      <span>{agent.tasks_completed} done</span>
                      <span>{agent.last_active}</span>
                      <button onClick={() => startEditing(agent)} style={{ background: "transparent", color: "#a1a1aa", border: "1px solid #27272a", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Edit</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* DIGITAL OFFICE VIEW */
        <div>
          <div style={{ fontSize: 14, color: "#71717a", marginBottom: 16 }}>
            {"\u{1F3E2}"} The Zo Office — see who's at their desk
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {agents.map((agent: any) => {
              const isWorking = agent.status === "active" && agent.tasks_active > 0;
              const isPaused = agent.status === "paused";
              const isIdle = agent.status === "active" && agent.tasks_active === 0;

              return (
                <div
                  key={agent.id}
                  style={{
                    background: isWorking ? "#18181b" : "#111113",
                    border: `1px solid ${isWorking ? "#3f3f46" : "#1f1f23"}`,
                    borderRadius: 12,
                    padding: 20,
                    position: "relative",
                    overflow: "hidden",
                    opacity: isPaused ? 0.4 : 1,
                  }}
                >
                  {/* Desk glow for working agents */}
                  {isWorking && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: agent.id === "henry" ? "#6366f1" : "#4ade80",
                      borderRadius: "12px 12px 0 0",
                    }} />
                  )}

                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 36, display: "block", marginBottom: 8, filter: isPaused ? "grayscale(1)" : "none" }}>
                      {agent.emoji}
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>{agent.role}</div>

                    {/* Status badge */}
                    {isWorking && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#052e16", border: "1px solid #166534", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#4ade80" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s infinite" }} />
                        Working ({agent.tasks_active} tasks)
                      </div>
                    )}
                    {isIdle && (
                      <div style={{ display: "inline-block", background: "#27272a", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#71717a" }}>
                        Idle
                      </div>
                    )}
                    {isPaused && (
                      <div style={{ display: "inline-block", background: "#1c1917", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#78716c" }}>
                        Paused
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: "#52525b", textAlign: "center", marginTop: 8 }}>
                    Last active: {agent.last_active}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Office Legend */}
          <div style={{ display: "flex", gap: 24, marginTop: 24, justifyContent: "center" }}>
            {[
              { color: "#4ade80", label: "Working" },
              { color: "#71717a", label: "Idle" },
              { color: "#78716c", label: "Paused" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#71717a" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
