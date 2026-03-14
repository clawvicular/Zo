import { useState, useEffect, useRef, useCallback } from "react";

// Only use icons known to exist in all lucide-react versions
import { Activity, Brain, Plus, Play, Square, Terminal, Cpu, Wrench, Zap, Clock } from "lucide-react";

const CYCLE_MS = 5 * 60 * 1000; // 5 minutes

export default function AutoResearch() {
  const [llmState, setLlmState] = useState<any>(null);
  const [metaState, setMetaState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoActive, setAutoActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [cycles, setCycles] = useState(0);

  const timerRef = useRef<any>(null);
  const tickRef = useRef<any>(null);
  const nextRef = useRef(0);
  const restoredRef = useRef(false);

  // Fetch both APIs in parallel — one failing doesn't break the other
  const fetchState = useCallback(async () => {
    const [metaRes, llmRes] = await Promise.allSettled([
      fetch("/api/meta-improve").then(r => r.ok ? r.json() : null),
      fetch("/api/autoresearch").then(r => r.ok ? r.json() : null),
    ]);
    if (metaRes.status === "fulfilled" && metaRes.value) setMetaState(metaRes.value);
    if (llmRes.status === "fulfilled" && llmRes.value) setLlmState(llmRes.value);
  }, []);

  const log = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${t}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const runOneCycle = useCallback(async () => {
    log("Starting experiment cycle...");
    try {
      const res = await fetch("/api/meta-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto" }),
      });
      const data = await res.json();
      if (data.success) {
        const icon = data.experiment?.improved ? "+" : "-";
        log(`[${icon}] ${data.improvement?.name} -> ${data.improvement?.target}`);
        log("    " + data.result);
        if (data.experiment?.improved && data.experiment?.score != null) {
          log("    Score: " + data.experiment.score.toFixed(1));
        }
      } else {
        log("Cycle failed: " + (data.error || "unknown"));
      }
      await fetchState();
      setCycles((c) => c + 1);
      log("Done. Next cycle in 5 min.");
    } catch (e: any) {
      log("Error: " + (e?.message || "network error"));
    }
  }, [log, fetchState]);

  const startLoop = useCallback(
    (skipPersist = false) => {
      if (timerRef.current) return;
      setAutoActive(true);
      log("Auto-evolution STARTED");

      if (!skipPersist) {
        fetch("/api/meta-improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_auto", value: true }),
        }).catch(() => {});
      }

      runOneCycle();
      nextRef.current = Date.now() + CYCLE_MS;

      timerRef.current = setInterval(() => {
        runOneCycle();
        nextRef.current = Date.now() + CYCLE_MS;
      }, CYCLE_MS);

      tickRef.current = setInterval(() => {
        setCountdown(Math.max(0, Math.ceil((nextRef.current - Date.now()) / 1000)));
      }, 1000);
    },
    [log, runOneCycle]
  );

  const stopLoop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setAutoActive(false);
    setCountdown(0);
    log("Auto-evolution STOPPED");
    fetch("/api/meta-improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_auto", value: false }),
    }).catch(() => {});
  }, [log]);

  // Polling
  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 5000);
    return () => clearInterval(id);
  }, [fetchState]);

  // Restore auto-cycle from server state
  useEffect(() => {
    if (metaState?.auto_cycle_active && !autoActive && !restoredRef.current) {
      restoredRef.current = true;
      startLoop(true);
    }
  }, [metaState?.auto_cycle_active, autoActive, startLoop]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const metaAction = async (action: string, extra = {}) => {
    setLoading(true);
    try {
      await fetch("/api/meta-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      await fetchState();
    } catch (e: any) {
      setError(e?.message || "Request failed");
    }
    setLoading(false);
  };

  const llmAction = async (action: string, extra = {}) => {
    setLoading(true);
    try {
      await fetch("/api/autoresearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      await fetchState();
    } catch (e: any) {
      setError(e?.message || "Request failed");
    }
    setLoading(false);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    return m + ":" + (s % 60).toString().padStart(2, "0");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Brain size={32} color="#a855f7" />
            <div>
              <h1 style={{ fontSize: 24, fontWeight: "bold", margin: 0 }}>AutoResearch</h1>
              <p style={{ color: "#a1a1aa", margin: 0, fontSize: 14 }}>
                Karpathy-style self-improvement for Mission Control
              </p>
            </div>
          </div>
          <a href="/" style={{ padding: "8px 16px", background: "#27272a", borderRadius: 8, color: "#f4f4f5", textDecoration: "none" }}>
            Dashboard
          </a>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: "#7f1d1d", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f4f4f5", cursor: "pointer" }}>x</button>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Score", value: (metaState?.best_score ?? 0).toFixed(1) + "/100", color: "#4ade80" },
            { label: "Generation", value: metaState?.gen ?? 0, color: "#60a5fa" },
            { label: "Status", value: autoActive ? "evolving" : "idle", color: autoActive ? "#4ade80" : "#a1a1aa" },
            { label: "Improved", value: metaState?.total_completed ?? 0, color: "#a855f7" },
            { label: "Success Rate", value: ((metaState?.success_rate ?? 0) * 100).toFixed(0) + "%", color: "#facc15" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#18181b", borderRadius: 12, padding: 16 }}>
              <div style={{ color: "#a1a1aa", fontSize: 12, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: "bold", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Main Loop Control */}
        <div style={{
          background: "#18181b",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: autoActive ? "2px solid rgba(74, 222, 128, 0.4)" : "2px solid rgba(168, 85, 247, 0.3)",
          boxShadow: autoActive ? "0 0 20px rgba(74, 222, 128, 0.1)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Clock size={20} color={autoActive ? "#4ade80" : "#a855f7"} />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>5-Minute Self-Improvement Loop</h2>
            {autoActive && (
              <span style={{ marginLeft: 8, padding: "2px 8px", background: "#16a34a", borderRadius: 4, fontSize: 12 }}>
                ACTIVE
              </span>
            )}
          </div>
          <p style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 16 }}>
            Every 5 min: propose improvement → run experiment → measure score → keep if improved, discard if not.
            Like Karpathy's autoresearch but evolving the dashboard instead of training LLMs.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {!autoActive ? (
              <button onClick={() => startLoop()} style={{ padding: "12px 24px", background: "#16a34a", borderRadius: 8, border: "none", color: "white", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Play size={18} /> Start Auto-Evolution
              </button>
            ) : (
              <button onClick={stopLoop} style={{ padding: "12px 24px", background: "#dc2626", borderRadius: 8, border: "none", color: "white", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Square size={18} /> Stop
              </button>
            )}

            <button onClick={() => metaAction("auto")} disabled={loading} style={{ padding: "12px 16px", background: "#7c3aed", borderRadius: 8, border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.5 : 1 }}>
              <Zap size={16} /> Run Single Experiment
            </button>

            {autoActive && (
              <>
                <div style={{ background: "#27272a", borderRadius: 8, padding: "8px 16px" }}>
                  <span style={{ color: "#a1a1aa", fontSize: 13 }}>Next in </span>
                  <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: 18 }}>{fmtTime(countdown)}</span>
                </div>
                <div style={{ background: "#27272a", borderRadius: 8, padding: "8px 16px" }}>
                  <span style={{ color: "#a1a1aa", fontSize: 13 }}>Cycles: </span>
                  <span style={{ color: "#a855f7", fontWeight: "bold" }}>{cycles}</span>
                </div>
              </>
            )}
          </div>

          {/* Activity Log */}
          {logs.length > 0 && (
            <div style={{ background: "#09090b", borderRadius: 8, padding: 16, maxHeight: 192, overflowY: "auto", fontFamily: "monospace", fontSize: 11 }}>
              {logs.map((l, i) => (
                <div key={i} style={{ padding: "2px 0", color: i === 0 ? "#4ade80" : "#71717a" }}>{l}</div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Controls */}
        <div style={{ background: "#18181b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Wrench size={20} color="#a855f7" />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Manual Controls</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Proposed", value: metaState?.proposed_count ?? 0, color: "#f4f4f5" },
              { label: "In Progress", value: metaState?.in_progress_count ?? 0, color: "#facc15" },
              { label: "Failed", value: metaState?.total_failed ?? 0, color: "#f87171" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#27272a", borderRadius: 8, padding: 16 }}>
                <div style={{ color: "#a1a1aa", fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button onClick={() => metaAction("propose")} disabled={loading} style={{ padding: "8px 16px", background: "#7c3aed", borderRadius: 8, border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.5 : 1 }}>
              <Plus size={16} /> Propose Improvement
            </button>
            <button onClick={() => metaAction("reset")} disabled={loading} style={{ padding: "8px 16px", background: "#dc2626", borderRadius: 8, border: "none", color: "white", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
              Reset All
            </button>
          </div>

          {/* Pending experiments */}
          {metaState?.improvements?.filter((i: any) => i.status === "proposed" || i.status === "in_progress")?.map((imp: any) => (
            <div key={imp.id} style={{ background: "#27272a", borderRadius: 8, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{imp.name}</div>
                <div style={{ fontSize: 13, color: "#a1a1aa" }}>{imp.description}</div>
                <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>
                  <span style={{ background: "#3f3f46", padding: "2px 6px", borderRadius: 4, marginRight: 8 }}>{imp.category}</span>
                  {imp.target} | diff: {imp.difficulty}/5
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ padding: "4px 8px", borderRadius: 4, fontSize: 11, background: imp.status === "proposed" ? "#3f3f46" : "#a16207" }}>
                  {imp.status}
                </span>
                {imp.status === "proposed" && (
                  <button onClick={() => metaAction("start", { id: imp.id })} disabled={loading} style={{ padding: "4px 12px", background: "#16a34a", borderRadius: 4, border: "none", color: "white", fontSize: 11, cursor: "pointer" }}>
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Experiment History */}
        <div style={{ background: "#18181b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Terminal size={20} />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Experiment History</h2>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {(() => {
              const finished = metaState?.improvements?.filter((i: any) => i.status === "completed" || i.status === "failed") || [];
              if (finished.length === 0) {
                return (
                  <div style={{ color: "#71717a", textAlign: "center", padding: 32 }}>
                    No experiments yet. Hit "Start Auto-Evolution" above!
                  </div>
                );
              }
              return finished.slice(-20).reverse().map((imp: any) => (
                <div key={imp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#27272a", borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                    background: imp.status === "completed" ? "#14532d" : "#7f1d1d",
                    color: imp.status === "completed" ? "#4ade80" : "#f87171",
                  }}>
                    {imp.status === "completed" ? "kept" : "discarded"}
                  </span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{imp.name}</span>
                  <span style={{ fontSize: 11, background: "#3f3f46", padding: "2px 6px", borderRadius: 4 }}>{imp.category}</span>
                  <span style={{ color: "#71717a", fontSize: 11 }}>{imp.target}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* LLM Training (original Karpathy-style) */}
        <div style={{ background: "#18181b", borderRadius: 12, padding: 24, border: "1px solid #27272a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Cpu size={20} />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>LLM Training Experiments</h2>
          </div>
          <p style={{ color: "#71717a", fontSize: 13, marginBottom: 16 }}>
            Karpathy-style val_bpb optimization (separate from Mission Control self-improvement)
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Best val_bpb", value: llmState?.best_val_bpb?.toFixed(3) ?? "—", color: "#4ade80" },
              { label: "Experiments", value: llmState?.experiments?.length ?? 0, color: "#60a5fa" },
              { label: "Status", value: llmState?.status ?? "idle", color: "#a1a1aa" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#27272a", borderRadius: 8, padding: 12 }}>
                <div style={{ color: "#71717a", fontSize: 11 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {[
              { label: "Baseline", action: "baseline", icon: Play, bg: "#2563eb", extra: {} as any },
              { label: "Next Gen", action: "next_gen", icon: Plus, bg: "#16a34a", extra: {} as any },
              { label: "Stop", action: "stop", icon: Square, bg: "#dc2626", extra: {} as any },
              { label: "Auto (10)", action: "autonomous", icon: Zap, bg: "#7c3aed", extra: { count: 10 } as any },
              { label: "Auto (100)", action: "autonomous", icon: Activity, bg: "#6d28d9", extra: { count: 100 } as any },
            ].map((btn, i) => {
              const Icon = btn.icon;
              return (
                <button key={i} onClick={() => llmAction(btn.action, btn.extra)} disabled={loading}
                  style={{ padding: "8px 12px", background: btn.bg, borderRadius: 8, border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, opacity: loading ? 0.5 : 1 }}>
                  <Icon size={14} /> {btn.label}
                </button>
              );
            })}
          </div>

          {/* LLM History */}
          {(llmState?.experiments?.length ?? 0) > 0 && (
            <div style={{ marginTop: 16, maxHeight: 192, overflowY: "auto" }}>
              {llmState.experiments.slice(-10).reverse().map((exp: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, background: "#27272a", borderRadius: 8, marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: "#71717a", width: 48 }}>Gen {exp.gen}</span>
                  <span style={{ fontFamily: "monospace", color: exp.improved ? "#4ade80" : "#a1a1aa" }}>
                    {exp.val_bpb?.toFixed(3) ?? "N/A"}
                  </span>
                  <span style={{
                    padding: "2px 6px", borderRadius: 4, fontSize: 10,
                    background: exp.improved ? "#14532d" : "#3f3f46",
                    color: exp.improved ? "#4ade80" : "#a1a1aa",
                  }}>
                    {exp.improved ? "kept" : "discarded"}
                  </span>
                  <span style={{ color: "#71717a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {exp.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
