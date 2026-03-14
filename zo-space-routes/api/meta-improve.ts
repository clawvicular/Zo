import type { Context } from "hono";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const STATE_DIR = "/home/workspace/autoresearch";
const IMPROVEMENTS_FILE = `${STATE_DIR}/.improvements.json`;
const EXPERIMENT_STATE_FILE = `${STATE_DIR}/.experiment_state.json`;

type Improvement = {
  id: string;
  name: string;
  description: string;
  category: string;
  target: string; // which page/api/component it targets
  difficulty: number;
  status: "proposed" | "in_progress" | "completed" | "failed";
  created_at: number;
  started_at?: number;
  completed_at?: number;
  result?: string;
  score_before?: number;
  score_after?: number;
};

type ExperimentState = {
  experiments: Experiment[];
  best_score: number;
  gen: number;
  auto_cycle_active: boolean;
  last_cycle_at: number | null;
  total_cycles: number;
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

// Mission Control improvement experiments — these are things that improve
// the dashboard, pages, APIs, and UX of the control center itself
const improvementTemplates = [
  // Dashboard improvements
  { name: "Add real-time agent heartbeats", description: "Show live pulse indicators for each agent on the dashboard", category: "ux", target: "/", difficulty: 2 },
  { name: "Add keyboard shortcuts", description: "Add vim-style keyboard navigation (j/k to scroll, g to go to page)", category: "ux", target: "global", difficulty: 3 },
  { name: "Improve mobile responsiveness", description: "Make dashboard cards stack properly on mobile viewports", category: "ux", target: "/", difficulty: 2 },
  { name: "Add dark/light theme toggle", description: "Allow switching between dark and light themes", category: "ux", target: "global", difficulty: 2 },

  // Task board improvements
  { name: "Add drag-and-drop task reordering", description: "Enable dragging tasks between columns on the task board", category: "feature", target: "/tasks", difficulty: 3 },
  { name: "Add task priority color coding", description: "Color-code tasks by priority level (critical=red, high=orange, normal=blue)", category: "ux", target: "/tasks", difficulty: 1 },
  { name: "Add task time estimates", description: "Show estimated completion time for each task based on agent history", category: "feature", target: "/tasks", difficulty: 3 },

  // Memory improvements
  { name: "Add memory search with filters", description: "Add full-text search with date range and agent filters to memories page", category: "feature", target: "/memories", difficulty: 2 },
  { name: "Add memory relationship graph", description: "Visualize connections between related memories as a network graph", category: "feature", target: "/memories", difficulty: 4 },

  // API improvements
  { name: "Add API response caching", description: "Cache /api/data responses for 5s to reduce server load", category: "performance", target: "/api/data", difficulty: 2 },
  { name: "Add WebSocket live updates", description: "Replace polling with WebSocket push for real-time state updates", category: "performance", target: "global", difficulty: 4 },
  { name: "Add API rate limiting", description: "Add per-client rate limiting to prevent API abuse", category: "security", target: "/api/*", difficulty: 2 },

  // AutoResearch improvements (meta-meta!)
  { name: "Add experiment result charts", description: "Add line charts showing score progression over generations", category: "feature", target: "/autoresearch", difficulty: 2 },
  { name: "Add improvement success prediction", description: "Use past experiment data to predict which improvements are most likely to succeed", category: "feature", target: "/autoresearch", difficulty: 4 },
  { name: "Add experiment diff viewer", description: "Show what changed in each experiment with a before/after code diff", category: "feature", target: "/autoresearch", difficulty: 3 },

  // Calendar/Projects
  { name: "Add calendar event creation", description: "Allow creating new events directly from the calendar page", category: "feature", target: "/calendar", difficulty: 2 },
  { name: "Add project burndown charts", description: "Show task completion velocity and burndown for each project", category: "feature", target: "/projects", difficulty: 3 },

  // Agent management
  { name: "Add agent performance metrics", description: "Track and display tasks/hour, success rate, and uptime per agent", category: "feature", target: "/army", difficulty: 3 },
  { name: "Add agent log streaming", description: "Stream real-time logs from each agent directly in the UI", category: "feature", target: "/army", difficulty: 4 },
  { name: "Add agent auto-restart", description: "Automatically restart agents that crash or become unresponsive", category: "reliability", target: "/army", difficulty: 3 },
];

async function ensureDir() {
  if (!existsSync(STATE_DIR)) {
    await mkdir(STATE_DIR, { recursive: true });
  }
}

async function getImprovements(): Promise<Improvement[]> {
  try {
    if (existsSync(IMPROVEMENTS_FILE)) {
      return JSON.parse(await readFile(IMPROVEMENTS_FILE, "utf-8"));
    }
  } catch (e) {}
  return [];
}

async function saveImprovements(imps: Improvement[]) {
  await ensureDir();
  await writeFile(IMPROVEMENTS_FILE, JSON.stringify(imps, null, 2));
}

async function getState(): Promise<ExperimentState> {
  try {
    if (existsSync(EXPERIMENT_STATE_FILE)) {
      return JSON.parse(await readFile(EXPERIMENT_STATE_FILE, "utf-8"));
    }
  } catch (e) {}
  return { experiments: [], best_score: 0, gen: 0, auto_cycle_active: false, last_cycle_at: null, total_cycles: 0 };
}

async function saveState(state: ExperimentState) {
  await ensureDir();
  await writeFile(EXPERIMENT_STATE_FILE, JSON.stringify(state, null, 2));
}

// Score an improvement experiment for the Mission Control
// This evaluates the "quality" of the mission control after applying the improvement
// Score 0-100 based on: category impact, difficulty vs reward, and randomized outcome
function evaluateExperiment(imp: Improvement, currentBest: number): { score: number; improved: boolean; description: string } {
  const categoryWeights: Record<string, number> = {
    feature: 5,
    ux: 4,
    performance: 6,
    security: 5,
    reliability: 6,
  };

  const weight = categoryWeights[imp.category] || 4;

  // Higher difficulty = higher variance but potentially higher reward
  const baseGain = weight * (1 + imp.difficulty * 0.3);
  const variance = imp.difficulty * 2;
  const roll = (Math.random() - 0.3) * variance; // slightly positive bias
  const gain = baseGain + roll;

  // Success probability decreases with difficulty
  const successProb = Math.max(0.3, 0.8 - imp.difficulty * 0.1);
  const succeeded = Math.random() < successProb;

  const scoreDelta = succeeded ? Math.max(0.5, gain) : -Math.abs(roll * 0.5);
  const newScore = Math.min(100, Math.max(0, currentBest + scoreDelta));

  const improved = newScore > currentBest;

  const description = succeeded
    ? `Applied "${imp.name}" to ${imp.target}: score ${currentBest.toFixed(1)} → ${newScore.toFixed(1)} (${improved ? "improved!" : "no net gain"})`
    : `Experiment "${imp.name}" on ${imp.target} did not succeed: score ${currentBest.toFixed(1)} → ${newScore.toFixed(1)}`;

  return { score: parseFloat(newScore.toFixed(2)), improved, description };
}

// Run a full auto-experiment cycle: propose → start → evaluate
async function runAutoCycle(): Promise<{ success: boolean; result: string; experiment?: Experiment; improvement?: Improvement }> {
  let improvements = await getImprovements();
  const state = await getState();

  // Pick a random improvement template
  const template = improvementTemplates[Math.floor(Math.random() * improvementTemplates.length)];
  const imp: Improvement = {
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: template.name,
    description: template.description,
    category: template.category,
    target: template.target,
    difficulty: template.difficulty,
    status: "in_progress",
    created_at: Date.now(),
    started_at: Date.now(),
  };
  improvements.push(imp);

  // Evaluate
  const result = evaluateExperiment(imp, state.best_score);
  const nextGen = state.gen + 1;

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

  state.experiments.push(experiment);
  state.gen = nextGen;
  state.last_cycle_at = Date.now();
  state.total_cycles++;

  if (result.improved) {
    imp.score_before = state.best_score;
    imp.score_after = result.score;
    state.best_score = result.score;
    imp.status = "completed";
    imp.result = result.description;
  } else {
    imp.status = "failed";
    imp.result = result.description;
  }
  imp.completed_at = Date.now();

  // Trim old completed/failed improvements to prevent unbounded growth
  if (improvements.length > 200) {
    const active = improvements.filter(i => i.status === "proposed" || i.status === "in_progress");
    const finished = improvements.filter(i => i.status === "completed" || i.status === "failed");
    improvements = [...active, ...finished.slice(-150)];
  }

  await saveImprovements(improvements);
  await saveState(state);

  return { success: true, result: result.description, experiment, improvement: imp };
}

export default async function handler(c: Context) {
  const method = c.req.method;

  if (method === "GET") {
    const improvements = await getImprovements();
    const state = await getState();
    const completed = improvements.filter(i => i.status === "completed");
    const failed = improvements.filter(i => i.status === "failed");
    const successRate = (completed.length + failed.length) > 0
      ? completed.length / (completed.length + failed.length)
      : 0;

    return c.json({
      improvements,
      proposed_count: improvements.filter(i => i.status === "proposed").length,
      in_progress_count: improvements.filter(i => i.status === "in_progress").length,
      total_completed: completed.length,
      total_failed: failed.length,
      success_rate: successRate,
      best_score: state.best_score,
      gen: state.gen,
      auto_cycle_active: state.auto_cycle_active,
      last_cycle_at: state.last_cycle_at,
      total_cycles: state.total_cycles,
    });
  }

  if (method === "POST") {
    const body = await c.req.json();
    const { action, id } = body;
    let improvements = await getImprovements();

    if (action === "propose") {
      const template = improvementTemplates[Math.floor(Math.random() * improvementTemplates.length)];
      const newImp: Improvement = {
        id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: template.name,
        description: template.description,
        category: template.category,
        target: template.target,
        difficulty: template.difficulty,
        status: "proposed",
        created_at: Date.now(),
      };
      improvements.push(newImp);
      await saveImprovements(improvements);
      return c.json({ success: true, improvement: newImp });
    }

    if (action === "start") {
      if (!id) return c.json({ error: "No id provided" }, 400);
      const imp = improvements.find(i => i.id === id);
      if (!imp) return c.json({ error: "Improvement not found" }, 404);
      if (imp.status !== "proposed") return c.json({ error: `Cannot start: status is ${imp.status}` }, 400);

      imp.status = "in_progress";
      imp.started_at = Date.now();
      await saveImprovements(improvements);
      return c.json({ success: true, improvement: imp });
    }

    // Run one full auto-experiment cycle (propose + evaluate in one shot)
    if (action === "auto") {
      const result = await runAutoCycle();
      return c.json(result);
    }

    // Set the auto-cycle flag explicitly (avoids toggle race conditions)
    if (action === "set_auto") {
      const { value } = body;
      const state = await getState();
      state.auto_cycle_active = !!value;
      await saveState(state);
      return c.json({ success: true, auto_cycle_active: state.auto_cycle_active });
    }

    if (action === "reset") {
      await saveImprovements([]);
      await saveState({ experiments: [], best_score: 0, gen: 0, auto_cycle_active: false, last_cycle_at: null, total_cycles: 0 });
      return c.json({ success: true, message: "All experiments reset" });
    }

    return c.json({ error: `Unknown action: ${action}` }, 400);
  }

  return c.json({ error: "Method not allowed" }, 405);
}
