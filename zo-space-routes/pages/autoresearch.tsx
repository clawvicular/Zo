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
