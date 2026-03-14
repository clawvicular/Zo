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
