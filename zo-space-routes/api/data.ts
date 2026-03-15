import type { Context } from "hono";

// ============================================================================
// Mission Control — Central Data API
// Serves agents, tasks, memories, projects, documents, activities, mission
// Supports global search and activity logging
// ============================================================================

type Agent = {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string;
  status: "active" | "paused" | "error";
  specialty: string;
  tasks_active: number;
  tasks_completed: number;
  last_active: string;
  created: string;
  capabilities: string[];
  schedule: string;
};

type Task = {
  id: string;
  title: string;
  status: "inbox" | "assigned" | "in_progress" | "review" | "done";
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  project: string;
  created: string;
  updated: string;
};

type Memory = {
  id: string;
  agent: string;
  type: string;
  content: string;
  tags: string[];
  timestamp: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
  progress: number;
  tasks_total: number;
  tasks_complete: number;
  deadline: string;
  documents: string[];
};

type Document = {
  id: string;
  name: string;
  agent: string;
  created: string;
  tags: string[];
};

type Activity = {
  id: string;
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
  tokens_used: number;
};

// ============================================================================
// In-memory data stores — seeded from AGENTS.md
// ============================================================================

let missionStatement =
  "Our mission is to leverage AI agents to amplify human capabilities, automate repetitive tasks, and achieve ambitious goals that would be impossible alone.";

const agents: Agent[] = [
  {
    id: "henry",
    name: "Henry",
    emoji: "\u{1F451}",
    role: "Chief Orchestrator",
    model: "claude-opus-4-6",
    status: "active",
    specialty: "High-level planning, task delegation, result synthesis",
    tasks_active: 5,
    tasks_completed: 412,
    last_active: "1m ago",
    created: "2026-03-10",
    capabilities: ["orchestrate", "delegate", "plan", "synthesize"],
    schedule: "always-on",
  },
  {
    id: "research",
    name: "ResearchBot",
    emoji: "\u{1F50D}",
    role: "Deep Researcher",
    model: "minimax-m2.5",
    status: "active",
    specialty: "Research & Analysis",
    tasks_active: 12,
    tasks_completed: 89,
    last_active: "2m ago",
    created: "2026-03-12",
    capabilities: ["web-search", "summarize", "report"],
    schedule: "every 2 hours",
  },
  {
    id: "build",
    name: "BuildBot",
    emoji: "\u{1F528}",
    role: "Full-Stack Developer",
    model: "minimax-m2.5",
    status: "active",
    specialty: "Coding & Development",
    tasks_active: 8,
    tasks_completed: 156,
    last_active: "5m ago",
    created: "2026-03-12",
    capabilities: ["code-gen", "deploy", "test", "verify"],
    schedule: "every 2 hours",
  },
  {
    id: "memory",
    name: "MemoryBot",
    emoji: "\u{1F9E0}",
    role: "Memory Keeper",
    model: "minimax-m2.5",
    status: "active",
    specialty: "Memory Management",
    tasks_active: 24,
    tasks_completed: 342,
    last_active: "1h ago",
    created: "2026-03-12",
    capabilities: ["memory-read", "memory-write", "consolidate"],
    schedule: "every 4 hours",
  },
  {
    id: "doc",
    name: "DocBot",
    emoji: "\u{1F4DD}",
    role: "Technical Writer",
    model: "minimax-m2.5",
    status: "paused",
    specialty: "Documentation",
    tasks_active: 3,
    tasks_completed: 67,
    last_active: "3h ago",
    created: "2026-03-12",
    capabilities: ["write-docs", "readme", "changelog"],
    schedule: "on-demand",
  },
  {
    id: "schedule",
    name: "ScheduleBot",
    emoji: "\u{23F0}",
    role: "Time Manager",
    model: "minimax-m2.5",
    status: "active",
    specialty: "Scheduling & Planning",
    tasks_active: 18,
    tasks_completed: 203,
    last_active: "15m ago",
    created: "2026-03-12",
    capabilities: ["calendar-read", "notify", "deadline-check"],
    schedule: "every 2 hours",
  },
  {
    id: "comm",
    name: "CommBot",
    emoji: "\u{1F4E8}",
    role: "Communications",
    model: "minimax-m2.5",
    status: "active",
    specialty: "Email & Messaging",
    tasks_active: 6,
    tasks_completed: 45,
    last_active: "30m ago",
    created: "2026-03-12",
    capabilities: ["message", "report", "status-update"],
    schedule: "every 6 hours",
  },
];

const tasks: Task[] = [
  { id: "t1", title: "Implement knowledge base ingestion pipeline", status: "in_progress", assignee: "BuildBot", priority: "high", project: "Knowledge Base Construction", created: "2026-03-13", updated: "2026-03-15" },
  { id: "t2", title: "Research vector DB options for memory storage", status: "done", assignee: "ResearchBot", priority: "high", project: "Knowledge Base Construction", created: "2026-03-12", updated: "2026-03-14" },
  { id: "t3", title: "Design agent communication protocol", status: "in_progress", assignee: "BuildBot", priority: "urgent", project: "Agent Army Expansion", created: "2026-03-14", updated: "2026-03-15" },
  { id: "t4", title: "Write API integration guide", status: "assigned", assignee: "DocBot", priority: "medium", project: "Knowledge Base Construction", created: "2026-03-13", updated: "2026-03-13" },
  { id: "t5", title: "Consolidate March memory logs", status: "in_progress", assignee: "MemoryBot", priority: "medium", project: "Knowledge Base Construction", created: "2026-03-14", updated: "2026-03-15" },
  { id: "t6", title: "Set up agent monitoring dashboard", status: "done", assignee: "BuildBot", priority: "high", project: "Mission Control Dashboard", created: "2026-03-12", updated: "2026-03-13" },
  { id: "t7", title: "Research multi-agent orchestration frameworks", status: "done", assignee: "ResearchBot", priority: "high", project: "Agent Army Expansion", created: "2026-03-13", updated: "2026-03-14" },
  { id: "t8", title: "Implement auto-scaling for sub-agents", status: "assigned", assignee: "BuildBot", priority: "high", project: "Agent Army Expansion", created: "2026-03-14", updated: "2026-03-14" },
  { id: "t9", title: "Create agent performance benchmarks", status: "inbox", assignee: "", priority: "medium", project: "Agent Army Expansion", created: "2026-03-15", updated: "2026-03-15" },
  { id: "t10", title: "Deploy AutoResearch improvements", status: "review", assignee: "BuildBot", priority: "high", project: "Mission Control Dashboard", created: "2026-03-14", updated: "2026-03-15" },
  { id: "t11", title: "Schedule deadline reminders for all projects", status: "done", assignee: "ScheduleBot", priority: "medium", project: "Mission Control Dashboard", created: "2026-03-12", updated: "2026-03-13" },
  { id: "t12", title: "Send weekly status report", status: "assigned", assignee: "CommBot", priority: "low", project: "Mission Control Dashboard", created: "2026-03-15", updated: "2026-03-15" },
  { id: "t13", title: "Evaluate CrewAI vs LangGraph for army", status: "in_progress", assignee: "ResearchBot", priority: "high", project: "Agent Army Expansion", created: "2026-03-14", updated: "2026-03-15" },
  { id: "t14", title: "Build memory deduplication system", status: "assigned", assignee: "MemoryBot", priority: "medium", project: "Knowledge Base Construction", created: "2026-03-14", updated: "2026-03-14" },
  { id: "t15", title: "Create agent onboarding workflow", status: "inbox", assignee: "", priority: "low", project: "Agent Army Expansion", created: "2026-03-15", updated: "2026-03-15" },
];

const memories: Memory[] = [
  { id: "m1", agent: "ScheduleBot", type: "schedule_check", content: "VERIFIED - All 5 active agents running. Mission Control Dashboard: COMPLETE (100%). Knowledge Base Construction in 6 days (Mar 20, 60%), Agent Army Expansion in 18 days (Apr 1, 30%). No schedule conflicts detected.", tags: ["schedule", "check", "status"], timestamp: "2026-03-14T03:50:00Z" },
  { id: "m2", agent: "ResearchBot", type: "research", content: "Fresh AI agent framework research for Agent Army Expansion (30%, due Apr 1). Key findings: Top 2026 frameworks: LangGraph (best for complex stateful workflows), CrewAI (rapid prototyping, 60% Fortune 500 adoption), AutoGen/AG2 (Microsoft-backed), OpenAI Agents SDK (new entrant). Multi-agent orchestration is now essential.", tags: ["research", "AI-agents", "frameworks"], timestamp: "2026-03-14T02:50:00Z" },
  { id: "m3", agent: "BuildBot", type: "build_check", content: "System verification - All 16 Mission Control routes operational (10 pages + 5 APIs + 1 debug). No errors in space logs. API /api/data returns 6 agents, 34 memories, 3 projects, 8 documents. Mission Control Dashboard 100% complete.", tags: ["build-check", "verification"], timestamp: "2026-03-14T02:45:00Z" },
  { id: "m4", agent: "BuildBot", type: "bug_fix", content: "Fixed AutoResearch self-improvement loop - the /autoresearch page had NO automated 5-minute experiment cycle. Rewrote all 3 route files with auto-experiment loop, start/stop, countdown timer, activity log, server persistence.", tags: ["bug-fix", "autoresearch", "self-improvement"], timestamp: "2026-03-14T05:00:00Z" },
  { id: "m5", agent: "BuildBot", type: "task_complete", content: "Mission Control Dashboard is now 100% complete. All 16 routes operational. Fixed /api/chat-henry by adding fallback mode. Dashboard accessible at https://lora.zo.space/", tags: ["mission-control", "complete"], timestamp: "2026-03-13T14:55:00Z" },
  { id: "m6", agent: "ResearchBot", type: "research", content: "Analyzed Alex Finn's Mission Control video - identified key screens: Task Board, Calendar, Projects, Memories, Documents, Team, Office. Key features: mission statement drives idle behavior, activity feed tracks everything, global search across all data.", tags: ["research", "mission-control", "video"], timestamp: "2026-03-12T22:30:00Z" },
  { id: "m7", agent: "MemoryBot", type: "memory_consolidation", content: "Consolidated memory log - organized recent memories by project, created cross-references. Key findings: 3 active projects, 5 active agents, AutoResearch Gen 3 with val_bpb 1.942663.", tags: ["memory", "consolidation"], timestamp: "2026-03-13T08:00:00Z" },
  { id: "m8", agent: "ResearchBot", type: "research", content: "Researched AI agent frameworks: CrewAI, OpenAI Agents Python, Microsoft Agent Framework, LangGraph, AutoGen, Lux. 2026 trends: Multi-agent systems reduce hand-offs by 45%, visual orchestration becoming essential, MCP protocol adoption for interoperability.", tags: ["research", "AI-agents", "frameworks"], timestamp: "2026-03-13T02:50:00Z" },
  { id: "m9", agent: "DocBot", type: "documentation", content: "Created README.md for EvoChat project and MISSION_CONTROL_README.md documenting the Mission Control Dashboard routes, API endpoints, and features.", tags: ["documentation", "evochat", "mission-control"], timestamp: "2026-03-13T10:10:00Z" },
  { id: "m10", agent: "CommBot", type: "comm_check", content: "Checked for pending communications tasks - none found. No email drafts, no social media posts queued. CommBot running normally with 6 active tasks.", tags: ["comm", "check", "status"], timestamp: "2026-03-13T09:05:00Z" },
];

const projects: Project[] = [
  {
    id: "p1",
    name: "Mission Control Dashboard",
    status: "complete",
    progress: 100,
    tasks_total: 12,
    tasks_complete: 12,
    deadline: "2026-03-15",
    documents: ["Mission Control Spec", "UI Design Guide"],
  },
  {
    id: "p2",
    name: "Knowledge Base Construction",
    status: "active",
    progress: 60,
    tasks_total: 18,
    tasks_complete: 11,
    deadline: "2026-03-20",
    documents: ["Memory System Design", "Research Archive"],
  },
  {
    id: "p3",
    name: "Agent Army Expansion",
    status: "active",
    progress: 30,
    tasks_total: 24,
    tasks_complete: 7,
    deadline: "2026-04-01",
    documents: ["Agent Army Roadmap"],
  },
];

const documents: Document[] = [
  { id: "d1", name: "Mission Control Spec", agent: "DocBot", created: "2026-03-12", tags: ["spec", "architecture"] },
  { id: "d2", name: "AI Frameworks Comparison", agent: "ResearchBot", created: "2026-03-11", tags: ["research", "comparison"] },
  { id: "d3", name: "Agent Army Roadmap", agent: "Henry", created: "2026-03-10", tags: ["roadmap", "planning"] },
  { id: "d4", name: "API Integration Guide", agent: "BuildBot", created: "2026-03-09", tags: ["api", "guide"] },
  { id: "d5", name: "Memory System Design", agent: "MemoryBot", created: "2026-03-08", tags: ["memory", "design"] },
  { id: "d6", name: "Memory Consolidation Summary", agent: "MemoryBot", created: "2026-03-13", tags: ["memory", "consolidation"] },
  { id: "d7", name: "EvoChat README", agent: "DocBot", created: "2026-03-13", tags: ["evochat", "guide"] },
  { id: "d8", name: "Mission Control Dashboard README", agent: "DocBot", created: "2026-03-13", tags: ["mission-control", "dashboard", "guide"] },
];

const activities: Activity[] = [
  { id: "a1", agent: "ScheduleBot", action: "schedule_check", detail: "Verified all 5 active agents running. No schedule conflicts.", timestamp: "2026-03-15T08:50:00Z", tokens_used: 1240 },
  { id: "a2", agent: "BuildBot", action: "deploy", detail: "Deployed enhanced AutoResearch page with auto-cycle loop.", timestamp: "2026-03-15T08:30:00Z", tokens_used: 3420 },
  { id: "a3", agent: "ResearchBot", action: "research", detail: "Completed AI framework comparison: LangGraph vs CrewAI for agent army.", timestamp: "2026-03-15T08:15:00Z", tokens_used: 8650 },
  { id: "a4", agent: "MemoryBot", action: "consolidate", detail: "Consolidated 34 memory entries into 12 summaries.", timestamp: "2026-03-15T07:45:00Z", tokens_used: 4200 },
  { id: "a5", agent: "Henry", action: "delegate", detail: "Assigned knowledge base ingestion task to BuildBot.", timestamp: "2026-03-15T07:30:00Z", tokens_used: 890 },
  { id: "a6", agent: "CommBot", action: "status_update", detail: "Sent daily status digest to team channels.", timestamp: "2026-03-15T07:00:00Z", tokens_used: 1560 },
  { id: "a7", agent: "BuildBot", action: "build", detail: "Implemented memory dedup pipeline for knowledge base.", timestamp: "2026-03-15T06:45:00Z", tokens_used: 5800 },
  { id: "a8", agent: "ScheduleBot", action: "deadline_reminder", detail: "Knowledge Base Construction due in 5 days (Mar 20, 60%).", timestamp: "2026-03-15T06:00:00Z", tokens_used: 720 },
  { id: "a9", agent: "ResearchBot", action: "research", detail: "Gathered enterprise multi-agent deployment case studies.", timestamp: "2026-03-14T22:30:00Z", tokens_used: 7200 },
  { id: "a10", agent: "BuildBot", action: "bug_fix", detail: "Fixed chat-henry API fallback for MiniMax model.", timestamp: "2026-03-14T20:15:00Z", tokens_used: 2900 },
  { id: "a11", agent: "MemoryBot", action: "memory_write", detail: "Stored research findings on agent orchestration patterns.", timestamp: "2026-03-14T19:00:00Z", tokens_used: 1800 },
  { id: "a12", agent: "Henry", action: "plan", detail: "Planned next sprint: focus on knowledge base + army expansion.", timestamp: "2026-03-14T18:00:00Z", tokens_used: 2100 },
  { id: "a13", agent: "DocBot", action: "documentation", detail: "Created Mission Control README with route documentation.", timestamp: "2026-03-14T16:00:00Z", tokens_used: 3600 },
  { id: "a14", agent: "ScheduleBot", action: "schedule_check", detail: "All agents verified running. Mission Control 100% complete.", timestamp: "2026-03-14T15:50:00Z", tokens_used: 1100 },
  { id: "a15", agent: "BuildBot", action: "task_complete", detail: "Mission Control Dashboard marked 100% complete.", timestamp: "2026-03-13T14:55:00Z", tokens_used: 450 },
];

let activityCounter = activities.length;
let taskCounter = tasks.length;

// ============================================================================
// Schedule data (cron jobs / recurring tasks)
// ============================================================================

const schedule = [
  { id: "s1", agent: "ScheduleBot", task: "System status check", cron: "Every 2 hours", next_run: "2026-03-15T10:50:00Z", last_run: "2026-03-15T08:50:00Z" },
  { id: "s2", agent: "ResearchBot", task: "AI trends research", cron: "Every 2 hours", next_run: "2026-03-15T10:15:00Z", last_run: "2026-03-15T08:15:00Z" },
  { id: "s3", agent: "BuildBot", task: "Build verification", cron: "Every 2 hours", next_run: "2026-03-15T10:30:00Z", last_run: "2026-03-15T08:30:00Z" },
  { id: "s4", agent: "MemoryBot", task: "Memory consolidation", cron: "Every 4 hours", next_run: "2026-03-15T11:45:00Z", last_run: "2026-03-15T07:45:00Z" },
  { id: "s5", agent: "CommBot", task: "Daily status digest", cron: "Daily at 7:00 AM", next_run: "2026-03-16T07:00:00Z", last_run: "2026-03-15T07:00:00Z" },
  { id: "s6", agent: "ScheduleBot", task: "Deadline reminders", cron: "Daily at 6:00 AM", next_run: "2026-03-16T06:00:00Z", last_run: "2026-03-15T06:00:00Z" },
  { id: "s7", agent: "DocBot", task: "Documentation review", cron: "On-demand (paused)", next_run: "-", last_run: "2026-03-14T16:00:00Z" },
];

// ============================================================================
// Global search helper
// ============================================================================

function globalSearch(query: string) {
  if (!query || query.trim() === "") return [];
  const q = query.toLowerCase();
  const results: { type: string; id: string; title: string; content: string; agent: string; timestamp: string }[] = [];

  for (const agent of agents) {
    if (agent.name.toLowerCase().includes(q) || agent.role.toLowerCase().includes(q) || agent.specialty.toLowerCase().includes(q)) {
      results.push({ type: "agent", id: agent.id, title: agent.name, content: `${agent.role} — ${agent.specialty}`, agent: agent.name, timestamp: agent.created });
    }
  }
  for (const p of projects) {
    if (p.name.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)) {
      results.push({ type: "project", id: p.id, title: p.name, content: `${p.status} — ${p.progress}% complete`, agent: "", timestamp: p.deadline });
    }
  }
  for (const m of memories) {
    if (m.content.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q))) {
      results.push({ type: "memory", id: m.id, title: `${m.type} by ${m.agent}`, content: m.content, agent: m.agent, timestamp: m.timestamp });
    }
  }
  for (const t of tasks) {
    if (t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q)) {
      results.push({ type: "task", id: t.id, title: t.title, content: `${t.status} — ${t.project}`, agent: t.assignee || "Unassigned", timestamp: t.updated });
    }
  }
  for (const d of documents) {
    if (d.name.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q))) {
      results.push({ type: "document", id: d.id, title: d.name, content: d.tags.join(", "), agent: d.agent, timestamp: d.created });
    }
  }
  for (const a of activities) {
    if (a.detail.toLowerCase().includes(q) || a.action.toLowerCase().includes(q)) {
      results.push({ type: "activity", id: a.id, title: `${a.action} by ${a.agent}`, content: a.detail, agent: a.agent, timestamp: a.timestamp });
    }
  }

  return results;
}

// ============================================================================
// Request handler
// ============================================================================

export default async function handler(c: Context) {
  const method = c.req.method;

  // POST actions
  if (method === "POST") {
    try {
      const body = await c.req.json();
      const action = body.action;

      if (action === "set_mission") {
        missionStatement = (body.mission !== undefined && body.mission !== null) ? body.mission : missionStatement;
        return c.json({ ok: true, mission: missionStatement });
      }

      if (action === "add_activity") {
        activityCounter++;
        const activity: Activity = {
          id: `a${activityCounter}`,
          agent: body.agent || "System",
          action: body.activity_action || "unknown",
          detail: body.detail || "",
          timestamp: new Date().toISOString(),
          tokens_used: body.tokens_used || 0,
        };
        activities.unshift(activity);
        if (activities.length > 200) activities.pop();
        return c.json({ ok: true, activity });
      }

      if (action === "global_search") {
        const results = globalSearch(body.query || "");
        return c.json({ ok: true, results, query: body.query });
      }

      if (action === "update_task") {
        if (!body.task_id) return c.json({ ok: false, error: "task_id is required" }, 400);
        const task = tasks.find((t) => t.id === body.task_id);
        if (task) {
          if (body.status !== undefined) task.status = body.status;
          if (body.assignee !== undefined) task.assignee = body.assignee;
          if (body.priority !== undefined) task.priority = body.priority;
          task.updated = new Date().toISOString().split("T")[0];
          return c.json({ ok: true, task });
        }
        return c.json({ ok: false, error: "Task not found" }, 404);
      }

      if (action === "add_task") {
        taskCounter++;
        const id = `t${taskCounter}`;
        const task: Task = {
          id,
          title: body.title || "New task",
          status: body.status || "inbox",
          assignee: body.assignee || "",
          priority: body.priority || "medium",
          project: body.project || "",
          created: new Date().toISOString().split("T")[0],
          updated: new Date().toISOString().split("T")[0],
        };
        tasks.push(task);
        return c.json({ ok: true, task });
      }

      if (action === "add_memory") {
        const memory: Memory = {
          id: `m${memories.length + 1}_${Date.now()}`,
          agent: body.agent || "Henry",
          type: body.type || "note",
          content: body.content || "",
          tags: body.tags || [],
          timestamp: new Date().toISOString(),
        };
        memories.unshift(memory);
        if (memories.length > 500) memories.pop();
        return c.json({ ok: true, memory });
      }

      if (action === "get_full_status") {
        const tasksByStatus: Record<string, number> = {};
        for (const t of tasks) {
          tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
        }
        return c.json({
          ok: true,
          mission: missionStatement,
          agents: agents.map((a) => ({ name: a.name, role: a.role, status: a.status, tasks_active: a.tasks_active })),
          tasks_summary: tasksByStatus,
          tasks_total: tasks.length,
          projects: projects.map((p) => ({ name: p.name, status: p.status, progress: p.progress, deadline: p.deadline })),
          recent_activities: activities.slice(0, 10).map((a) => ({ agent: a.agent, action: a.action, detail: a.detail, timestamp: a.timestamp })),
          memories_count: memories.length,
        });
      }

      return c.json({ ok: false, error: "Unknown action" }, 400);
    } catch (e: any) {
      return c.json({ ok: false, error: e.message }, 500);
    }
  }

  // GET — return all data
  return c.json({
    mission: missionStatement,
    agents,
    tasks,
    memories,
    projects,
    documents,
    activities: activities.slice(0, 50),
    schedule,
    stats: {
      active_agents: agents.filter((a) => a.status === "active").length,
      total_agents: agents.length,
      tasks_in_progress: tasks.filter((t) => t.status === "in_progress").length,
      tasks_total: tasks.length,
      total_memories: memories.length,
      total_activities: activities.length,
      total_documents: documents.length,
      active_projects: projects.filter((p) => p.status === "active").length,
      tokens_today: activities.filter((a) => a.timestamp.startsWith(new Date().toISOString().split("T")[0])).reduce((s, a) => s + a.tokens_used, 0),
    },
  });
}
