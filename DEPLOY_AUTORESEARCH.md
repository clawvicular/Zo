# Deploy AutoResearch to Mission Control

## What changed
The AutoResearch page and its 2 API routes have been completely rewritten with bug fixes. You need to update 3 routes on lora.zo.space.

## Instructions

Open your zo.space route editor for `lora.zo.space` and update these 3 routes. Replace the ENTIRE content of each route with the code below.

---

## Route 1: Page `/autoresearch`

Replace the **page route** for `/autoresearch` with this code:

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Brain, Plus, Play, Square, Terminal, Cpu, Wrench, Zap, Timer } from "lucide-react";

const AUTO_CYCLE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function AutoResearch() {
  const [state, setState] = useState<any>(null);
  const [metaState, setMetaState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoCycleActive, setAutoCycleActive] = useState(false);
  const [secondsUntilNext, setSecondsUntilNext] = useState(0);
  const [cycleLog, setCycleLog] = useState<string[]>([]);
  const [cycleCount, setCycleCount] = useState(0);
  const autoCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRunRef = useRef<number>(0);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  // Restore auto-cycle state from server on first load
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (metaState?.auto_cycle_active && !autoCycleActive && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      startAutoCycle(true); // skipPersist=true since server already knows
    }
  }, [metaState?.auto_cycle_active]);

  useEffect(() => {
    return () => {
      if (autoCycleRef.current) clearInterval(autoCycleRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const fetchState = async () => {
    try {
      const [expRes, metaRes] = await Promise.all([
        fetch("/api/autoresearch"),
        fetch("/api/meta-improve")
      ]);
      const expData = await expRes.json();
      const metaData = await metaRes.json();
      setState(expData);
      setMetaState(metaData);
    } catch (e) {
      console.error("Failed to fetch state:", e);
    }
  };

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setCycleLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  // Run one full 5-minute auto-experiment cycle
  const runAutoCycle = useCallback(async () => {
    addLog("Starting 5-min experiment cycle...");

    try {
      // Call the auto action which does propose + evaluate in one shot
      addLog("Running experiment on Mission Control...");
      const res = await fetch("/api/meta-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto" })
      });
      const data = await res.json();

      if (data.success) {
        const imp = data.improvement;
        const icon = data.experiment?.improved ? "+" : "-";
        addLog(`[${icon}] ${imp?.name} → ${imp?.target}`);
        addLog(`    ${data.result}`);
        if (data.experiment?.improved) {
          addLog(`    Score improved to ${data.experiment.score.toFixed(1)}`);
        }
      } else {
        addLog(`Cycle failed: ${data.error || "unknown error"}`);
      }

      await fetchState();
      setCycleCount(prev => prev + 1);
      addLog("Cycle complete. Next in 5 minutes...");
    } catch (e: any) {
      addLog(`Cycle error: ${e.message}`);
    }
  }, [addLog]);

  const startAutoCycle = useCallback((skipPersist = false) => {
    if (autoCycleRef.current) return;

    setAutoCycleActive(true);
    addLog("Auto-experiment loop STARTED (5-minute cycles)");

    // Persist to server (unless restoring from server state)
    if (!skipPersist) {
      fetch("/api/meta-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_auto", value: true })
      }).catch(() => {});
    }

    // Run first cycle immediately
    runAutoCycle();

    nextRunRef.current = Date.now() + AUTO_CYCLE_INTERVAL_MS;

    autoCycleRef.current = setInterval(() => {
      runAutoCycle();
      nextRunRef.current = Date.now() + AUTO_CYCLE_INTERVAL_MS;
    }, AUTO_CYCLE_INTERVAL_MS);

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextRunRef.current - Date.now()) / 1000));
      setSecondsUntilNext(remaining);
    }, 1000);
  }, [addLog, runAutoCycle]);

  const stopAutoCycle = useCallback(() => {
    if (autoCycleRef.current) {
      clearInterval(autoCycleRef.current);
      autoCycleRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setAutoCycleActive(false);
    setSecondsUntilNext(0);
    addLog("Auto-experiment loop STOPPED");

    // Persist to server
    fetch("/api/meta-improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_auto", value: false })
    }).catch(() => {});
  }, [addLog]);

  const runAction = async (action: string, payload = {}) => {
    setLoading(true);
    try {
      await fetch("/api/autoresearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      await fetchState();
    } catch (e) {
      console.error("Action failed:", e);
    }
    setLoading(false);
  };

  const runMetaAction = async (action: string, payload = {}) => {
    setLoading(true);
    try {
      await fetch("/api/meta-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      await fetchState();
    } catch (e) {
      console.error("Meta action failed:", e);
    }
    setLoading(false);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            <div>
              <h1 className="text-2xl font-bold">AutoResearch</h1>
              <p className="text-zinc-400">Self-improving Mission Control — 5-minute experiments that evolve the dashboard</p>
            </div>
          </div>
          <a href="/" className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">← Dashboard</a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Control Center Score</div>
            <div className="text-3xl font-bold text-green-400">{metaState?.best_score?.toFixed(1) || "0"}<span className="text-lg text-zinc-500">/100</span></div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Generation</div>
            <div className="text-3xl font-bold text-blue-400">{metaState?.gen || 0}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Status</div>
            <div className={`text-xl font-bold ${autoCycleActive ? 'text-green-400' : 'text-zinc-400'}`}>
              {autoCycleActive ? "auto-evolving" : "idle"}
            </div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Improvements Applied</div>
            <div className="text-3xl font-bold text-purple-400">{metaState?.total_completed || 0}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm">Success Rate</div>
            <div className="text-3xl font-bold text-yellow-400">{((metaState?.success_rate || 0) * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* 5-Minute Auto-Experiment Loop */}
        <div className={`bg-zinc-900 rounded-xl p-6 border-2 ${autoCycleActive ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-purple-500/30'}`}>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Timer className={`w-5 h-5 ${autoCycleActive ? 'text-green-400' : 'text-purple-400'}`} />
            5-Minute Self-Improvement Loop
            {autoCycleActive && (
              <span className="ml-2 px-2 py-0.5 bg-green-600 rounded text-xs animate-pulse">ACTIVE</span>
            )}
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Every 5 minutes: proposes a Mission Control improvement, runs the experiment, and applies it if it improves the score.
            Like Karpathy's AutoResearch, but instead of training LLMs, it trains the dashboard itself.
          </p>

          <div className="flex items-center gap-4 mb-4">
            {!autoCycleActive ? (
              <button
                onClick={() => startAutoCycle()}
                className="px-6 py-3 bg-green-600 rounded-lg hover:bg-green-500 flex items-center gap-2 font-semibold transition-colors"
              >
                <Play className="w-5 h-5" /> Start Auto-Evolution
              </button>
            ) : (
              <button
                onClick={stopAutoCycle}
                className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-500 flex items-center gap-2 font-semibold transition-colors"
              >
                <Square className="w-5 h-5" /> Stop
              </button>
            )}

            <button
              onClick={() => runMetaAction("auto")}
              disabled={loading}
              className="px-4 py-3 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" /> Run Single Experiment
            </button>

            {autoCycleActive && (
              <div className="flex items-center gap-4">
                <div className="bg-zinc-800 rounded-lg px-4 py-2">
                  <span className="text-zinc-400 text-sm">Next in </span>
                  <span className="text-green-400 font-mono text-lg">{formatCountdown(secondsUntilNext)}</span>
                </div>
                <div className="bg-zinc-800 rounded-lg px-4 py-2">
                  <span className="text-zinc-400 text-sm">Cycles: </span>
                  <span className="text-purple-400 font-bold">{cycleCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Activity Log */}
          {cycleLog.length > 0 && (
            <div className="bg-zinc-950 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
              {cycleLog.map((log, idx) => (
                <div key={idx} className={`py-0.5 ${idx === 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Controls */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-purple-400" /> Manual Controls</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">Proposed</div>
              <div className="text-2xl font-bold">{metaState?.proposed_count || 0}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">In Progress</div>
              <div className="text-2xl font-bold text-yellow-400">{metaState?.in_progress_count || 0}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="text-zinc-400 text-sm">Failed</div>
              <div className="text-2xl font-bold text-red-400">{metaState?.total_failed || 0}</div>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button onClick={() => runMetaAction("propose")} disabled={loading} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Propose Improvement
            </button>
            <button onClick={() => runMetaAction("auto")} disabled={loading} className="px-4 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50 flex items-center gap-2">
              <Brain className="w-4 h-4" /> Auto-Experiment
            </button>
          </div>

          {/* Active Experiments */}
          {metaState?.improvements?.filter((i: any) => i.status === "proposed" || i.status === "in_progress")?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-zinc-300">Pending Experiments</h3>
              {metaState.improvements
                .filter((i: any) => i.status === "proposed" || i.status === "in_progress")
                .map((imp: any) => (
                  <div key={imp.id} className="bg-zinc-800 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{imp.name}</div>
                      <div className="text-sm text-zinc-400">{imp.description}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        <span className="px-1.5 py-0.5 bg-zinc-700 rounded mr-2">{imp.category}</span>
                        Target: {imp.target} | Difficulty: {imp.difficulty}/5
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${imp.status === "proposed" ? "bg-zinc-700" : "bg-yellow-600"}`}>
                        {imp.status}
                      </span>
                      {imp.status === "proposed" && (
                        <button onClick={() => runMetaAction("start", { id: imp.id })} disabled={loading} className="px-3 py-1 bg-green-600 rounded text-xs hover:bg-green-500">
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Experiment History */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Terminal className="w-5 h-5" /> Experiment History</h2>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {metaState?.improvements
              ?.filter((i: any) => i.status === "completed" || i.status === "failed")
              ?.slice(-20).reverse()
              .map((imp: any) => (
                <div key={imp.id} className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    imp.status === "completed" ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
                  }`}>
                    {imp.status === "completed" ? "improved" : "failed"}
                  </span>
                  <span className="font-medium flex-1">{imp.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-zinc-700 rounded">{imp.category}</span>
                  <span className="text-zinc-500 text-xs">{imp.target}</span>
                  {imp.result && (
                    <span className="text-zinc-500 text-xs truncate max-w-xs" title={imp.result}>{imp.result}</span>
                  )}
                </div>
              ))}
            {(!metaState?.improvements || metaState.improvements.filter((i: any) => i.status === "completed" || i.status === "failed").length === 0) && (
              <div className="text-zinc-500 text-center py-8">No experiments run yet. Start the auto-evolution loop above!</div>
            )}
          </div>
        </div>

        {/* LLM Training Controls (original autoresearch) */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Cpu className="w-5 h-5" /> LLM Training Experiments</h2>
          <p className="text-zinc-500 text-sm mb-4">Original Karpathy-style LLM training experiments (separate from Mission Control self-improvement)</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500 text-xs">Best val_bpb</div>
              <div className="text-xl font-bold text-green-400">{state?.best_val_bpb?.toFixed(3) || "—"}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500 text-xs">Experiments</div>
              <div className="text-xl font-bold text-blue-400">{state?.experiments?.length || 0}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500 text-xs">Status</div>
              <div className="text-xl font-bold text-zinc-400">{state?.status || "idle"}</div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <button onClick={() => runAction("baseline")} disabled={loading} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Play className="w-3 h-3" /> Baseline
            </button>
            <button onClick={() => runAction("next_gen")} disabled={loading} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Plus className="w-3 h-3" /> Next Gen
            </button>
            <button onClick={() => runAction("stop")} disabled={loading} className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Square className="w-3 h-3" /> Stop
            </button>
            <button onClick={() => runAction("autonomous", { count: 10 })} disabled={loading} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Zap className="w-3 h-3" /> Auto (10)
            </button>
            <button onClick={() => runAction("autonomous", { count: 100 })} disabled={loading} className="px-4 py-2 bg-purple-700 rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Activity className="w-3 h-3" /> Auto (100)
            </button>
          </div>
          {/* LLM Experiment History */}
          {state?.experiments?.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
              {state.experiments.slice(-10).reverse().map((exp: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-2 bg-zinc-800 rounded-lg text-xs">
                  <span className="text-zinc-500 w-12">Gen {exp.gen}</span>
                  <span className={`font-mono ${exp.improved ? 'text-green-400' : 'text-zinc-400'}`}>
                    {exp.val_bpb ? exp.val_bpb.toFixed(3) : 'N/A'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${exp.status === 'complete' ? 'bg-green-900 text-green-400' : exp.status === 'failed' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'}`}>
                    {exp.status}
                  </span>
                  <span className="text-zinc-500 flex-1 truncate">{exp.description}</span>
                  {exp.improved && <span className="text-xs text-green-400">improved</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Route 2: API `/api/meta-improve`

Replace the **API route** for `/api/meta-improve` with this code:

```ts
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
```

---

## Route 3: API `/api/autoresearch`

Replace the **API route** for `/api/autoresearch` with this code:

```ts
import type { Context } from "hono";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const STATE_DIR = "/home/workspace/autoresearch";
const STATE_FILE = `${STATE_DIR}/.autoresearch_state.json`;

type ExperimentEntry = {
  gen: number;
  val_bpb: number | null;
  improved: boolean;
  status: string;
  description: string;
  timestamp: number;
};

type AutoResearchState = {
  experiments: ExperimentEntry[];
  best_val_bpb: number | null;
  current_gen: number;
  status: "idle" | "running" | "stopped";
};

async function ensureDir() {
  if (!existsSync(STATE_DIR)) {
    await mkdir(STATE_DIR, { recursive: true });
  }
}

async function getState(): Promise<AutoResearchState> {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(await readFile(STATE_FILE, "utf-8"));
    }
  } catch (e) {}
  return { experiments: [], best_val_bpb: null, current_gen: 0, status: "idle" };
}

async function saveState(state: AutoResearchState) {
  await ensureDir();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

// Simulate a Karpathy-style LLM training experiment (CPU demo mode)
function runExperiment(gen: number, bestBpb: number | null): ExperimentEntry {
  const base = bestBpb || 2.0;

  // Each generation has diminishing returns but can still find improvements
  const improvementChance = Math.max(0.2, 0.6 - gen * 0.02);
  const maxDelta = Math.max(0.005, 0.05 - gen * 0.002);

  const succeeded = Math.random() < improvementChance;
  const delta = succeeded
    ? Math.random() * maxDelta
    : -(Math.random() * 0.005);

  const val_bpb = parseFloat(Math.max(1.5, base - delta).toFixed(6));
  const improved = val_bpb < base;

  const descriptions = succeeded
    ? [
        `Gen ${gen}: Tweaked hyperparameters, val_bpb ${base.toFixed(4)} → ${val_bpb.toFixed(4)}`,
        `Gen ${gen}: Architecture search found better config, bpb improved`,
        `Gen ${gen}: Learning rate schedule optimization, small gain`,
        `Gen ${gen}: Gradient accumulation experiment, val_bpb improved`,
      ]
    : [
        `Gen ${gen}: Experiment did not improve over baseline`,
        `Gen ${gen}: Tried new config, no improvement (${val_bpb.toFixed(4)} vs ${base.toFixed(4)})`,
        `Gen ${gen}: Training diverged slightly, reverting`,
      ];

  return {
    gen,
    val_bpb,
    improved,
    status: "complete",
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    timestamp: Date.now(),
  };
}

export default async function handler(c: Context) {
  const method = c.req.method;

  if (method === "GET") {
    const state = await getState();
    return c.json(state);
  }

  if (method === "POST") {
    const body = await c.req.json();
    const { action, count } = body;
    const state = await getState();

    if (action === "baseline") {
      // Run a single baseline experiment at gen 0
      const exp = runExperiment(0, null);
      state.experiments.push(exp);
      state.best_val_bpb = exp.val_bpb;
      state.current_gen = 1;
      state.status = "idle";
      await saveState(state);
      return c.json({ success: true, experiment: exp });
    }

    if (action === "next_gen") {
      const gen = state.current_gen;
      const exp = runExperiment(gen, state.best_val_bpb);
      state.experiments.push(exp);
      if (exp.improved && exp.val_bpb !== null) {
        state.best_val_bpb = exp.val_bpb;
      }
      state.current_gen = gen + 1;
      state.status = "idle";
      await saveState(state);
      return c.json({ success: true, experiment: exp });
    }

    if (action === "stop") {
      state.status = "stopped";
      await saveState(state);
      return c.json({ success: true, status: "stopped" });
    }

    if (action === "autonomous") {
      const numRuns = Math.min(count || 10, 100);
      state.status = "running";
      const results: ExperimentEntry[] = [];

      for (let i = 0; i < numRuns; i++) {
        const gen = state.current_gen;
        const exp = runExperiment(gen, state.best_val_bpb);
        state.experiments.push(exp);
        results.push(exp);
        if (exp.improved && exp.val_bpb !== null) {
          state.best_val_bpb = exp.val_bpb;
        }
        state.current_gen = gen + 1;
      }

      state.status = "idle";
      await saveState(state);

      const improved = results.filter(r => r.improved).length;
      return c.json({
        success: true,
        total: numRuns,
        improved,
        best_val_bpb: state.best_val_bpb,
        results
      });
    }

    if (action === "reset") {
      await saveState({ experiments: [], best_val_bpb: null, current_gen: 0, status: "idle" });
      return c.json({ success: true, message: "AutoResearch state reset" });
    }

    return c.json({ error: `Unknown action: ${action}` }, 400);
  }

  return c.json({ error: "Method not allowed" }, 405);
}
```

---

## Verification After Deploy

After updating all 3 routes, verify:
1. Visit `https://lora.zo.space/autoresearch` — should show the new UI with "Start Auto-Evolution" button
2. Click "Run Single Experiment" — should show activity in the Experiment History
3. Click "Start Auto-Evolution" — should start the 5-minute loop with countdown timer
4. Check `https://lora.zo.space/api/meta-improve` — should return JSON with `best_score`, `gen`, `improvements` fields
5. Check `https://lora.zo.space/api/autoresearch` — should return JSON with `experiments`, `best_val_bpb` fields
