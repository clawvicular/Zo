import { useState, useEffect } from "react";

// ============================================================================
// Tasks — Kanban Board
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

const COLUMNS = [
  { key: "inbox", label: "Inbox", color: "#71717a" },
  { key: "assigned", label: "Assigned", color: "#60a5fa" },
  { key: "in_progress", label: "In Progress", color: "#fbbf24" },
  { key: "review", label: "Review", color: "#c084fc" },
  { key: "done", label: "Done", color: "#4ade80" },
];

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "#4c0519", text: "#fb7185" },
  high: { bg: "#451a03", text: "#fb923c" },
  medium: { bg: "#1c1917", text: "#a8a29e" },
  low: { bg: "#1a2e05", text: "#84cc16" },
};

export default function Tasks() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newProject, setNewProject] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDescription, setNewDescription] = useState("");

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

  async function moveTask(taskId: string, newStatus: string) {
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", task_id: taskId, status: newStatus }),
      });
      fetchData();
    } catch {}
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_task", task_id: taskId }),
      });
      fetchData();
    } catch {}
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_task", title: newTitle, assignee: newAssignee, priority: newPriority, project: newProject, due_date: newDueDate || undefined, description: newDescription || undefined, status: newAssignee ? "assigned" : "inbox" }),
      });
      setNewTitle("");
      setNewAssignee("");
      setNewPriority("medium");
      setNewProject("");
      setNewDueDate("");
      setNewDescription("");
      setShowAdd(false);
      fetchData();
    } catch {}
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

  const tasks = data.tasks || [];
  const agents = data.agents || [];

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", padding: "16px 24px" }}>
      <Nav current="/tasks" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>{"\u{1F4CB}"}</span>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Task Board</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ marginLeft: "auto", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          + Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Title</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title..." style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Assignee</label>
            <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
              <option value="">Unassigned</option>
              {agents.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Priority</label>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Project</label>
            <input value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="Project name..." style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Due Date</label>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "#71717a", display: "block", marginBottom: 4 }}>Description</label>
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Task description..." style={{ width: "100%", background: "#09090b", color: "#f4f4f5", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <button onClick={addTask} style={{ background: "#4ade80", color: "#09090b", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add</button>
        </div>
      )}

      {/* Kanban Columns */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: 12, overflow: "auto" }}>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t: any) => t.status === col.key);
          const colIdx = COLUMNS.findIndex((c) => c.key === col.key);
          const prevCol = colIdx > 0 ? COLUMNS[colIdx - 1].key : null;
          const nextCol = colIdx < COLUMNS.length - 1 ? COLUMNS[colIdx + 1].key : null;

          return (
            <div key={col.key} style={{ minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 0" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                <span style={{ fontSize: 12, color: "#52525b" }}>({colTasks.length})</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colTasks.map((task: any) => {
                  const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                  return (
                    <div key={task.id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 12, position: "relative" }}>
                      <button onClick={() => deleteTask(task.id)} style={{ position: "absolute", top: 6, right: 6, background: "transparent", color: "#52525b", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4 }} onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}>{"\u00d7"}</button>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, lineHeight: 1.4, paddingRight: 16 }}>{task.title}</div>
                      {task.due_date && (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const due = new Date(task.due_date + "T00:00:00");
                        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const dueDateColor = diffDays < 0 ? "#ef4444" : diffDays <= 3 ? "#facc15" : "#4ade80";
                        return <div style={{ fontSize: 11, color: dueDateColor, marginBottom: 2 }}>Due: {task.due_date}</div>;
                      })()}
                      {task.description && <div style={{ fontSize: 11, color: "#71717a", marginBottom: 4, lineHeight: 1.3 }}>{task.description.length > 60 ? task.description.slice(0, 60) + "..." : task.description}</div>}
                      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: pc.text, background: pc.bg, padding: "2px 8px", borderRadius: 4 }}>{task.priority}</span>
                        {task.assignee && <span style={{ fontSize: 10, color: "#a1a1aa", background: "#27272a", padding: "2px 8px", borderRadius: 4 }}>{task.assignee}</span>}
                        {task.project && <span style={{ fontSize: 10, color: "#71717a", background: "#1c1917", padding: "2px 8px", borderRadius: 4 }}>{task.project}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {prevCol && (
                          <button onClick={() => moveTask(task.id, prevCol)} style={{ background: "#27272a", color: "#a1a1aa", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>{"\u2190"}</button>
                        )}
                        {nextCol && (
                          <button onClick={() => moveTask(task.id, nextCol)} style={{ background: "#27272a", color: "#a1a1aa", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>{"\u2192"}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
