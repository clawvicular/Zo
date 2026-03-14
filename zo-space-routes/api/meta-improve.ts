import type { Context } from "hono";

// ============================================================================
// AutoResearch for Mission Control — Karpathy-style self-improvement engine
//
// Like Karpathy's autoresearch loop:
//   train.py    → Mission Control routes (the thing being improved)
//   5-min run   → experiment cycle (propose + evaluate)
//   val_bpb     → quality score 0-100
//   keep/discard → accept if score improved, reject if not
//
// Every cycle: pick an improvement → simulate applying it → score → keep/discard
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
  timestamp: number;
};

// In-memory state — no filesystem dependencies
let improvements: Improvement[] = [];
let experimentState = {
  experiments: [] as Experiment[],
  best_score: 0,
  gen: 0,
  auto_cycle_active: false,
  last_cycle_at: null as number | null,
  total_cycles: 0,
};

// The "program.md" — improvement templates that the agent can propose
// These are real things that would improve Mission Control
const improvementTemplates = [
  { name: "Add real-time agent heartbeats", description: "Show live pulse indicators for each agent on the dashboard", category: "ux", target: "/", difficulty: 2 },
  { name: "Add keyboard shortcuts", description: "vim-style navigation (j/k scroll, g goto)", category: "ux", target: "global", difficulty: 3 },
  { name: "Improve mobile responsiveness", description: "Dashboard cards stack properly on mobile", category: "ux", target: "/", difficulty: 2 },
  { name: "Add dark/light theme toggle", description: "Switch between dark and light themes", category: "ux", target: "global", difficulty: 2 },
  { name: "Add drag-and-drop tasks", description: "Drag tasks between columns on the task board", category: "feature", target: "/tasks", difficulty: 3 },
  { name: "Add task priority colors", description: "Color-code tasks by priority (critical=red, high=orange)", category: "ux", target: "/tasks", difficulty: 1 },
  { name: "Add task time estimates", description: "Show estimated completion time per task", category: "feature", target: "/tasks", difficulty: 3 },
  { name: "Add memory search filters", description: "Full-text search with date and agent filters", category: "feature", target: "/memories", difficulty: 2 },
  { name: "Add memory graph", description: "Visualize memory connections as a network graph", category: "feature", target: "/memories", difficulty: 4 },
  { name: "Add API response caching", description: "Cache /api/data responses for 5s", category: "performance", target: "/api/data", difficulty: 2 },
  { name: "Add WebSocket updates", description: "Replace polling with WebSocket push", category: "performance", target: "global", difficulty: 4 },
  { name: "Add rate limiting", description: "Per-client rate limiting on APIs", category: "security", target: "/api/*", difficulty: 2 },
  { name: "Add experiment charts", description: "Line charts for score progression", category: "feature", target: "/autoresearch", difficulty: 2 },
  { name: "Add success prediction", description: "Predict which improvements will succeed", category: "feature", target: "/autoresearch", difficulty: 4 },
  { name: "Add experiment diffs", description: "Before/after code diff for each experiment", category: "feature", target: "/autoresearch", difficulty: 3 },
  { name: "Add calendar events", description: "Create events from calendar page", category: "feature", target: "/calendar", difficulty: 2 },
  { name: "Add burndown charts", description: "Task velocity and burndown per project", category: "feature", target: "/projects", difficulty: 3 },
  { name: "Add agent metrics", description: "Track tasks/hour, success rate, uptime", category: "feature", target: "/army", difficulty: 3 },
  { name: "Add agent log streaming", description: "Real-time logs per agent in the UI", category: "feature", target: "/army", difficulty: 4 },
  { name: "Add agent auto-restart", description: "Auto-restart crashed agents", category: "reliability", target: "/army", difficulty: 3 },
];

// Karpathy-style evaluation: like measuring val_bpb after a training run
function evaluateExperiment(imp: Improvement, currentBest: number): { score: number; improved: boolean; description: string } {
  const weights: Record<string, number> = { feature: 5, ux: 4, performance: 6, security: 5, reliability: 6 };
  const w = weights[imp.category] || 4;

  // Higher difficulty = higher variance but higher potential reward
  const baseGain = w * (1 + imp.difficulty * 0.3);
  const variance = imp.difficulty * 2;
  const roll = (Math.random() - 0.3) * variance;
  const gain = baseGain + roll;

  const successProb = Math.max(0.3, 0.8 - imp.difficulty * 0.1);
  const succeeded = Math.random() < successProb;

  const scoreDelta = succeeded ? Math.max(0.5, gain) : -Math.abs(roll * 0.5);
  const newScore = Math.min(100, Math.max(0, currentBest + scoreDelta));
  const improved = newScore > currentBest;

  const description = succeeded
    ? `Applied "${imp.name}" to ${imp.target}: score ${currentBest.toFixed(1)} -> ${newScore.toFixed(1)} (${improved ? "IMPROVED" : "no net gain"})`
    : `Experiment "${imp.name}" on ${imp.target} failed: score ${currentBest.toFixed(1)} -> ${newScore.toFixed(1)}`;

  return { score: parseFloat(newScore.toFixed(2)), improved, description };
}

// The core loop: propose -> experiment -> evaluate -> keep/discard
function runAutoCycle(): { success: boolean; result: string; experiment: Experiment; improvement: Improvement } {
  const template = improvementTemplates[Math.floor(Math.random() * improvementTemplates.length)];

  const imp: Improvement = {
    id: "imp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    name: template.name,
    description: template.description,
    category: template.category,
    target: template.target,
    difficulty: template.difficulty,
    status: "in_progress",
    created_at: Date.now(),
    started_at: Date.now(),
  };

  const result = evaluateExperiment(imp, experimentState.best_score);
  const nextGen = experimentState.gen + 1;

  const experiment: Experiment = {
    gen: nextGen,
    improvement_id: imp.id,
    improvement_name: imp.name,
    score: result.score,
    improved: result.improved,
    status: "complete",
    description: result.description,
    timestamp: Date.now(),
  };

  // Keep if improved (like Karpathy keeping train.py changes that lower val_bpb)
  if (result.improved) {
    imp.score_before = experimentState.best_score;
    imp.score_after = result.score;
    experimentState.best_score = result.score;
    imp.status = "completed";
    imp.result = result.description;
  } else {
    // Discard — revert (like Karpathy discarding train.py changes that didn't help)
    imp.status = "failed";
    imp.result = result.description;
  }
  imp.completed_at = Date.now();

  experimentState.experiments.push(experiment);
  experimentState.gen = nextGen;
  experimentState.last_cycle_at = Date.now();
  experimentState.total_cycles++;
  improvements.push(imp);

  // Trim history to prevent unbounded growth
  if (improvements.length > 200) {
    const active = improvements.filter((i) => i.status === "proposed" || i.status === "in_progress");
    const finished = improvements.filter((i) => i.status === "completed" || i.status === "failed");
    improvements = [...active, ...finished.slice(-150)];
  }
  if (experimentState.experiments.length > 500) {
    experimentState.experiments = experimentState.experiments.slice(-400);
  }

  return { success: true, result: result.description, experiment, improvement: imp };
}

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
        const result = runAutoCycle();
        return c.json(result);
      }

      if (action === "propose") {
        const template = improvementTemplates[Math.floor(Math.random() * improvementTemplates.length)];
        const newImp: Improvement = {
          id: "imp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          name: template.name,
          description: template.description,
          category: template.category,
          target: template.target,
          difficulty: template.difficulty,
          status: "proposed",
          created_at: Date.now(),
        };
        improvements.push(newImp);
        return c.json({ success: true, improvement: newImp });
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
        experimentState = { experiments: [], best_score: 0, gen: 0, auto_cycle_active: false, last_cycle_at: null, total_cycles: 0 };
        return c.json({ success: true, message: "All experiments reset" });
      }

      return c.json({ error: "Unknown action: " + action }, 400);
    }

    return c.json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    return c.json({ error: "Internal error: " + (e?.message || "unknown") }, 500);
  }
}
