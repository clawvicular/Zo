import type { Context } from "hono";

// In-memory state — survives across requests but resets on deploy.
// This is intentional: like Karpathy's autoresearch, each "session" starts fresh.
let state: {
  experiments: ExperimentEntry[];
  best_val_bpb: number | null;
  current_gen: number;
  status: "idle" | "running" | "stopped";
} = {
  experiments: [],
  best_val_bpb: null,
  current_gen: 0,
  status: "idle",
};

type ExperimentEntry = {
  gen: number;
  val_bpb: number | null;
  improved: boolean;
  status: string;
  description: string;
  timestamp: number;
};

// Karpathy-style LLM training experiment simulation
// Models the "modify train.py → run 5 min → check val_bpb" loop
function runExperiment(gen: number, bestBpb: number | null): ExperimentEntry {
  const base = bestBpb ?? 2.0;
  const improvementChance = Math.max(0.2, 0.6 - gen * 0.02);
  const maxDelta = Math.max(0.005, 0.05 - gen * 0.002);
  const succeeded = Math.random() < improvementChance;
  const delta = succeeded ? Math.random() * maxDelta : -(Math.random() * 0.005);
  const val_bpb = parseFloat(Math.max(1.5, base - delta).toFixed(6));
  const improved = val_bpb < base;

  const desc = succeeded
    ? [
        `Gen ${gen}: Tweaked hyperparameters, val_bpb ${base.toFixed(4)} -> ${val_bpb.toFixed(4)}`,
        `Gen ${gen}: Architecture search found better config`,
        `Gen ${gen}: Learning rate schedule optimization`,
        `Gen ${gen}: Gradient accumulation experiment`,
      ]
    : [
        `Gen ${gen}: No improvement over baseline`,
        `Gen ${gen}: Tried new config, no gain (${val_bpb.toFixed(4)} vs ${base.toFixed(4)})`,
        `Gen ${gen}: Training diverged, reverting`,
      ];

  return {
    gen,
    val_bpb,
    improved,
    status: "complete",
    description: desc[Math.floor(Math.random() * desc.length)],
    timestamp: Date.now(),
  };
}

export default async function handler(c: Context) {
  try {
    const method = c.req.method;

    if (method === "GET") {
      return c.json({
        experiments: state.experiments,
        best_val_bpb: state.best_val_bpb,
        current_gen: state.current_gen,
        status: state.status,
      });
    }

    if (method === "POST") {
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Invalid JSON body" }, 400);
      }

      const { action, count } = body;

      if (action === "baseline") {
        const exp = runExperiment(0, null);
        state.experiments.push(exp);
        state.best_val_bpb = exp.val_bpb;
        state.current_gen = 1;
        state.status = "idle";
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
        return c.json({ success: true, experiment: exp });
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
        const improved = results.filter((r) => r.improved).length;
        return c.json({ success: true, total: numRuns, improved, best_val_bpb: state.best_val_bpb, results });
      }

      if (action === "stop") {
        state.status = "stopped";
        return c.json({ success: true, status: "stopped" });
      }

      if (action === "reset") {
        state = { experiments: [], best_val_bpb: null, current_gen: 0, status: "idle" };
        return c.json({ success: true, message: "Reset" });
      }

      return c.json({ error: "Unknown action: " + action }, 400);
    }

    return c.json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    return c.json({ error: "Internal error: " + (e?.message || "unknown") }, 500);
  }
}
