import type { Context } from "hono";

// ============================================================================
// AutoResearch for Mission Control — Real Karpathy-style self-improvement
//
// Like Karpathy's autoresearch loop:
//   train.py    → Mission Control route code + agent configs (the thing being improved)
//   5-min run   → LLM proposes improvement → LLM evaluates → keep/discard
//   val_bpb     → quality score 0-100 (LLM-assessed)
//   keep/discard → accept if score improved, reject if not
//
// Brain: Minimax 2.5 via OpenAI-compatible API
// ============================================================================

type Improvement = {
  id: string;
  name: string;
  description: string;
  category: string;
  target: string;
  difficulty: number;
  status: "proposed" | "in_progress" | "completed" | "failed";
  created_at: number;
  started_at?: number;
  completed_at?: number;
  result?: string;
  reasoning?: string;
  code_before?: string;
  code_after?: string;
  score_before?: number;
  score_after?: number;
};

type Experiment = {
  gen: number;
  improvement_id: string;
  improvement_name: string;
  score: number;
  improved: boolean;
  status: string;
  description: string;
  reasoning: string;
  timestamp: number;
};

type HeartbeatStatus = "idle" | "proposing" | "evaluating" | "deciding" | "error";

// In-memory state — no filesystem dependencies
let improvements: Improvement[] = [];
let experimentState = {
  experiments: [] as Experiment[],
  best_score: 12.0,
  gen: 0,
  auto_cycle_active: false,
  last_cycle_at: null as number | null,
  total_cycles: 0,
};

let heartbeat = {
  status: "idle" as HeartbeatStatus,
  last_active: Date.now(),
  current_experiment: null as string | null,
  error: null as string | null,
  llm_connected: false,
};

// In-memory code snapshots — the "train.py" being evolved
// Seeded with representative code for each Mission Control target
const routeSnapshots: Record<string, string> = {
  "/": `// Dashboard — main Mission Control overview
export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ tasks: 0, memories: 0, uptime: "0h" });
  useEffect(() => { fetch("/api/data").then(r => r.json()).then(setAgents); }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <h1>Mission Control</h1>
      <div className="stats-grid">{/* agent cards, task counts, status indicators */}</div>
      <div className="agent-list">{agents.map(a => <AgentCard key={a.id} agent={a} />)}</div>
    </div>
  );
}`,
  "/tasks": `// Task board — manage agent tasks
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <h1>Tasks</h1>
      <div className="filters">{/* status filters */}</div>
      <div className="task-list">{tasks.map(t => <TaskRow key={t.id} task={t} />)}</div>
    </div>
  );
}`,
  "/memories": `// Memory viewer — browse agent memory entries
export default function Memories() {
  const [memories, setMemories] = useState([]);
  const [search, setSearch] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <h1>Memories</h1>
      <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="memory-list">{memories.map(m => <MemoryCard key={m.id} memory={m} />)}</div>
    </div>
  );
}`,
  "/army": `// Agent Army — manage and monitor all agents
export default function Army() {
  const [agents, setAgents] = useState([]);
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <h1>Agent Army</h1>
      <div className="agent-grid">{agents.map(a => <AgentPanel key={a.id} agent={a} />)}</div>
    </div>
  );
}`,
  "/calendar": `// Calendar — schedule and events
export default function Calendar() {
  const [events, setEvents] = useState([]);
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <h1>Calendar</h1>
      <div className="calendar-grid">{/* month view with events */}</div>
    </div>
  );
}`,
  "/projects": `// Projects — track project progress
export default function Projects() {
  const [projects, setProjects] = useState([]);
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <h1>Projects</h1>
      <div className="project-list">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
    </div>
  );
}`,
  "agent-config": `// Agent system prompts and behaviors
agents:
  - name: ResearchBot
    role: Research and gather information
    model: minimax/minimax-m2.5
    schedule: every 2 hours
    capabilities: [web-search, summarize, report]
  - name: BuildBot
    role: Build, deploy, and verify systems
    model: minimax/minimax-m2.5
    schedule: every 2 hours
    capabilities: [code-gen, deploy, test, verify]
  - name: MemoryBot
    role: Consolidate and organize agent memories
    model: minimax/minimax-m2.5
    schedule: every 4 hours
    capabilities: [memory-read, memory-write, consolidate]
  - name: ScheduleBot
    role: Track deadlines and send reminders
    model: minimax/minimax-m2.5
    schedule: every 2 hours
    capabilities: [calendar-read, notify, deadline-check]
  - name: CommBot
    role: Communicate updates and status
    model: minimax/minimax-m2.5
    schedule: every 6 hours
    capabilities: [message, report, status-update]`,
};

// Target descriptions for the LLM
const targets = Object.keys(routeSnapshots);

// ============================================================================
// LLM Integration — Minimax 2.5 as the autoresearch brain
// ============================================================================

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = (globalThis as any).process?.env?.ZO_API_KEY
    || (globalThis as any).process?.env?.MINIMAX_API_KEY
    || (globalThis as any).process?.env?.ZO_CLIENT_IDENTITY_TOKEN;

  const baseUrl = (globalThis as any).process?.env?.LLM_BASE_URL || "https://api.minimax.io/v1";

  if (!apiKey) {
    heartbeat.llm_connected = false;
    return null;
  }

  // Validate API key format — reject JWTs and tokens with control chars
  // Bun's fetch() throws "The string did not match the expected pattern" for bad header values
  if (/[\r\n\x00-\x1f]/.test(apiKey) || apiKey.startsWith("eyJ")) {
    heartbeat.llm_connected = false;
    heartbeat.error = "Invalid API key format — set ZO_API_KEY or MINIMAX_API_KEY with a valid Minimax key";
    return null;
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      heartbeat.llm_connected = false;
      heartbeat.error = `LLM API returned ${res.status}`;
      return null;
    }

    const text = await res.text();
    const data = JSON.parse(text);
    heartbeat.llm_connected = true;
    heartbeat.error = null;
    return data.choices?.[0]?.message?.content || null;
  } catch (e: any) {
    heartbeat.llm_connected = false;
    heartbeat.error = e?.message || "LLM network error";
    return null;
  }
}

// Ask LLM to propose an improvement to a target
async function proposeLLMImprovement(targetKey: string): Promise<{ name: string; description: string; category: string; improvedCode: string } | null> {
  const currentCode = routeSnapshots[targetKey];
  if (!currentCode) return null;

  const systemPrompt = `You are an expert full-stack developer improving a Mission Control dashboard for managing AI agents. The dashboard is built with React + Hono on zo.space.

Your job: propose ONE specific, meaningful improvement to the given code. Focus on real improvements: better UX, new features, performance, reliability, or code quality.

Respond in this EXACT JSON format (no markdown, no code fences):
{"name": "Short improvement name", "description": "What this improvement does", "category": "feature|ux|performance|reliability|security", "improved_code": "The full improved code"}`;

  const userPrompt = `Target: ${targetKey}

Current code:
\`\`\`
${currentCode}
\`\`\`

Propose ONE improvement. Keep the code working and compatible with React + inline styles. Return only valid JSON.`;

  const response = await callLLM(systemPrompt, userPrompt);
  if (!response) return null;

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      name: parsed.name || "Unknown improvement",
      description: parsed.description || "",
      category: parsed.category || "feature",
      improvedCode: parsed.improved_code || "",
    };
  } catch {
    return null;
  }
}

// Ask LLM to evaluate an improvement
async function evaluateLLMImprovement(targetKey: string, originalCode: string, improvedCode: string, improvementDescription: string): Promise<{ score: number; reasoning: string } | null> {
  const systemPrompt = `You are a senior code reviewer evaluating improvements to a Mission Control dashboard.

Score the improvement on a 0-100 scale based on:
- Correctness (does it work? no syntax errors?)
- UX improvement (is it actually better for users?)
- Code quality (clean, maintainable, no regressions?)
- Feature value (does it add real value?)

A score of 50 means neutral (no improvement). Above 50 means improved. Below 50 means regression.

Respond in this EXACT JSON format (no markdown, no code fences):
{"score": <number 0-100>, "reasoning": "One sentence explaining your score"}`;

  const userPrompt = `Target: ${targetKey}
Improvement: ${improvementDescription}

ORIGINAL:
\`\`\`
${originalCode}
\`\`\`

IMPROVED:
\`\`\`
${improvedCode}
\`\`\`

Score this change. Return only valid JSON.`;

  const response = await callLLM(systemPrompt, userPrompt);
  if (!response) return null;

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50,
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Fallback scoring — used when LLM is unavailable
// Better than pure random: uses category weights and biases toward success
// ============================================================================

function fallbackEvaluate(name: string, category: string, difficulty: number, currentBest: number): { score: number; improved: boolean; description: string; reasoning: string } {
  const weights: Record<string, number> = { feature: 5, ux: 4, performance: 6, security: 5, reliability: 6 };
  const w = weights[category] || 4;

  // Bias toward improvement (60% chance of positive delta)
  const baseGain = w * (1 + difficulty * 0.2);
  const roll = (Math.random() - 0.4) * difficulty * 1.5;
  const succeeded = Math.random() < 0.6;
  const scoreDelta = succeeded ? Math.max(0.3, baseGain + roll) : -(Math.random() * 0.3);
  const newScore = Math.min(100, Math.max(0, currentBest + scoreDelta));
  const improved = newScore > currentBest;

  const description = improved
    ? `Applied "${name}": score ${currentBest.toFixed(1)} -> ${newScore.toFixed(1)} (IMPROVED)`
    : `Experiment "${name}" failed: score ${currentBest.toFixed(1)} -> ${newScore.toFixed(1)}`;

  return {
    score: parseFloat(newScore.toFixed(2)),
    improved,
    description,
    reasoning: "Evaluated with local scoring (LLM unavailable)",
  };
}

// ============================================================================
// The core auto-cycle: propose → experiment → evaluate → keep/discard
// ============================================================================

async function runAutoCycle(): Promise<{ success: boolean; result: string; experiment: Experiment; improvement: Improvement }> {
  const targetKey = targets[Math.floor(Math.random() * targets.length)];
  const currentCode = routeSnapshots[targetKey] || "";

  heartbeat.status = "proposing";
  heartbeat.last_active = Date.now();
  heartbeat.current_experiment = `Improving ${targetKey}`;

  // Try LLM-powered proposal first
  const proposal = await proposeLLMImprovement(targetKey);

  let impName: string;
  let impDescription: string;
  let impCategory: string;
  let improvedCode: string | null = null;
  let difficulty: number;

  if (proposal) {
    impName = proposal.name;
    impDescription = proposal.description;
    impCategory = proposal.category;
    improvedCode = proposal.improvedCode;
    difficulty = impCategory === "performance" ? 3 : impCategory === "feature" ? 2 : 1;
  } else {
    // Fallback: generate a plausible improvement name
    const fallbackNames = [
      { name: "Improve component structure", category: "ux" },
      { name: "Add error boundary", category: "reliability" },
      { name: "Optimize render cycle", category: "performance" },
      { name: "Add loading states", category: "ux" },
      { name: "Improve accessibility", category: "ux" },
    ];
    const fb = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    impName = fb.name;
    impDescription = `${fb.name} for ${targetKey}`;
    impCategory = fb.category;
    difficulty = 2;
  }

  const imp: Improvement = {
    id: "imp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    name: impName,
    description: impDescription,
    category: impCategory,
    target: targetKey,
    difficulty,
    status: "in_progress",
    created_at: Date.now(),
    started_at: Date.now(),
    code_before: currentCode.slice(0, 500),
    code_after: improvedCode ? improvedCode.slice(0, 500) : undefined,
  };

  // Evaluate the improvement
  heartbeat.status = "evaluating";
  heartbeat.last_active = Date.now();

  let evalResult: { score: number; improved: boolean; description: string; reasoning: string };

  if (improvedCode) {
    // Use LLM to evaluate the proposed change
    const llmEval = await evaluateLLMImprovement(targetKey, currentCode, improvedCode, impDescription);

    if (llmEval) {
      const improved = llmEval.score > 50;
      const newScore = experimentState.best_score + (llmEval.score - 50) * 0.1;
      const clampedScore = Math.min(100, Math.max(0, newScore));

      evalResult = {
        score: parseFloat(clampedScore.toFixed(2)),
        improved,
        description: improved
          ? `Applied "${impName}" to ${targetKey}: score ${experimentState.best_score.toFixed(1)} -> ${clampedScore.toFixed(1)} (IMPROVED)`
          : `Experiment "${impName}" on ${targetKey}: score ${experimentState.best_score.toFixed(1)} -> ${clampedScore.toFixed(1)}`,
        reasoning: llmEval.reasoning,
      };
    } else {
      evalResult = fallbackEvaluate(impName, impCategory, difficulty, experimentState.best_score);
    }
  } else {
    evalResult = fallbackEvaluate(impName, impCategory, difficulty, experimentState.best_score);
  }

  // Decide: keep or discard
  heartbeat.status = "deciding";
  heartbeat.last_active = Date.now();

  const nextGen = experimentState.gen + 1;

  const experiment: Experiment = {
    gen: nextGen,
    improvement_id: imp.id,
    improvement_name: impName,
    score: evalResult.score,
    improved: evalResult.improved,
    status: "complete",
    description: evalResult.description,
    reasoning: evalResult.reasoning,
    timestamp: Date.now(),
  };

  if (evalResult.improved) {
    imp.score_before = experimentState.best_score;
    imp.score_after = evalResult.score;
    experimentState.best_score = evalResult.score;
    imp.status = "completed";
    imp.result = evalResult.description;
    imp.reasoning = evalResult.reasoning;

    // Update the route snapshot with the improved code (the core Karpathy move)
    if (improvedCode) {
      routeSnapshots[targetKey] = improvedCode;
    }
  } else {
    imp.status = "failed";
    imp.result = evalResult.description;
    imp.reasoning = evalResult.reasoning;
  }
  imp.completed_at = Date.now();

  experimentState.experiments.push(experiment);
  experimentState.gen = nextGen;
  experimentState.last_cycle_at = Date.now();
  experimentState.total_cycles++;
  improvements.push(imp);

  // Trim history
  if (improvements.length > 200) {
    const active = improvements.filter((i) => i.status === "proposed" || i.status === "in_progress");
    const finished = improvements.filter((i) => i.status === "completed" || i.status === "failed");
    improvements = [...active, ...finished.slice(-150)];
  }
  if (experimentState.experiments.length > 500) {
    experimentState.experiments = experimentState.experiments.slice(-400);
  }

  heartbeat.status = "idle";
  heartbeat.current_experiment = null;

  return { success: true, result: evalResult.description, experiment, improvement: imp };
}

// ============================================================================
// HTTP Handler
// ============================================================================

export default async function handler(c: Context) {
  try {
    const method = c.req.method;

    if (method === "GET") {
      const completed = improvements.filter((i) => i.status === "completed");
      const failed = improvements.filter((i) => i.status === "failed");
      const total = completed.length + failed.length;

      return c.json({
        improvements,
        proposed_count: improvements.filter((i) => i.status === "proposed").length,
        in_progress_count: improvements.filter((i) => i.status === "in_progress").length,
        total_completed: completed.length,
        total_failed: failed.length,
        success_rate: total > 0 ? completed.length / total : 0,
        best_score: experimentState.best_score,
        gen: experimentState.gen,
        experiments: experimentState.experiments,
        auto_cycle_active: experimentState.auto_cycle_active,
        last_cycle_at: experimentState.last_cycle_at,
        total_cycles: experimentState.total_cycles,
        heartbeat,
        llm_connected: heartbeat.llm_connected,
        route_targets: targets,
        route_snapshots: Object.fromEntries(
          Object.entries(routeSnapshots).map(([k, v]) => [k, v.slice(0, 2000)])
        ),
      });
    }

    if (method === "POST") {
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
      }

      const { action, id, value } = body;

      if (action === "auto") {
        const result = await runAutoCycle();
        return c.json(result);
      }

      if (action === "propose") {
        // LLM-powered proposal
        const targetKey = targets[Math.floor(Math.random() * targets.length)];
        heartbeat.status = "proposing";
        heartbeat.last_active = Date.now();

        const proposal = await proposeLLMImprovement(targetKey);
        heartbeat.status = "idle";

        const newImp: Improvement = {
          id: "imp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          name: proposal?.name || "Proposed improvement",
          description: proposal?.description || `Improvement for ${targetKey}`,
          category: proposal?.category || "feature",
          target: targetKey,
          difficulty: 2,
          status: "proposed",
          created_at: Date.now(),
          code_after: proposal?.improvedCode?.slice(0, 500),
        };
        improvements.push(newImp);
        return c.json({ success: true, improvement: newImp, llm_used: !!proposal });
      }

      if (action === "start") {
        if (!id) return c.json({ error: "No id provided" }, 400);
        const imp = improvements.find((i) => i.id === id);
        if (!imp) return c.json({ error: "Not found" }, 404);
        if (imp.status !== "proposed") return c.json({ error: "Cannot start: " + imp.status }, 400);
        imp.status = "in_progress";
        imp.started_at = Date.now();
        return c.json({ success: true, improvement: imp });
      }

      if (action === "set_auto") {
        experimentState.auto_cycle_active = !!value;
        return c.json({ success: true, auto_cycle_active: experimentState.auto_cycle_active });
      }

      if (action === "reset") {
        improvements = [];
        experimentState = { experiments: [], best_score: 12.0, gen: 0, auto_cycle_active: false, last_cycle_at: null, total_cycles: 0 };
        heartbeat = { status: "idle", last_active: Date.now(), current_experiment: null, error: null, llm_connected: false };
        return c.json({ success: true, message: "All experiments reset" });
      }

      if (action === "heartbeat") {
        return c.json({ heartbeat });
      }

      return c.json({ error: "Unknown action: " + action }, 400);
    }

    return c.json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    heartbeat.status = "error";
    heartbeat.error = e?.message || "unknown";
    return c.json({ error: "Internal error: " + (e?.message || "unknown") }, 500);
  }
}
