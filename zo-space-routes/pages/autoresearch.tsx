import { useState, useEffect, useRef, useCallback } from "react";

// Only use icons known to exist in all lucide-react versions
import { Brain, Plus, Play, Square, Terminal, Cpu, Wrench, Zap, Clock } from "lucide-react";

const CYCLE_MS = 5 * 60 * 1000; // 5 minutes

export default function AutoResearch() {
  const [metaState, setMetaState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoActive, setAutoActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [cycles, setCycles] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState("/");

  const timerRef = useRef<any>(null);
  const tickRef = useRef<any>(null);
  const nextRef = useRef(0);
  const restoredRef = useRef(false);

  // Fetch both APIs in parallel — one failing doesn't break the other
  const fetchState = useCallback(async () => {
    const safeFetch = async (url: string) => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const text = await r.text();
        return JSON.parse(text);
      } catch {
        return null;
      }
    };
    const metaRes = await safeFetch("/api/meta-improve");
    if (metaRes) {
      setMetaState(metaRes);
      setError(null);
    } else {
      setError("Failed to load data");
    }
  }, []);

  const log = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${t}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const runOneCycle = useCallback(async () => {
    log("Starting experiment cycle...");
    log("  Minimax 2.5 proposing improvement...");
    try {
      const res = await fetch("/api/meta-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto" }),
      });

      // Safe JSON parsing — Bun throws "The string did not match the expected pattern"
      // if res.json() is called on a non-JSON response body
      let data: any;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        log("Error: Server returned non-JSON response (HTTP " + res.status + ")");
        await fetchState();
        setCycles((c) => c + 1);
        return;
      }

      if (data.success) {
        const icon = data.experiment?.improved ? "+" : "-";
        log(`[${icon}] ${data.improvement?.name} -> ${data.improvement?.target}`);
        if (data.experiment?.reasoning) {
          log("    " + data.experiment.reasoning);
        }
        log("    " + data.result);
        if (data.experiment?.improved && data.experiment?.score != null) {
          log("    Score: " + data.experiment.score.toFixed(1) + " (KEPT)");
        } else if (data.experiment?.score != null) {
          log("    Score: " + data.experiment.score.toFixed(1) + " (DISCARDED)");
        }
      } else {
        log("Cycle failed: " + (data.error || "unknown"));
      }
    } catch (e: any) {
      log("Error: " + (e?.message || "network error"));
    }
    // Always refresh state and increment cycle counter
    await fetchState();
    setCycles((c) => c + 1);
    log("Done. Next cycle in 5 min.");
  }, [log, fetchState]);

  const startLoop = useCallback(
    (skipPersist = false) => {
      if (timerRef.current) return;
      setAutoActive(true);
      log("Auto-evolution STARTED (Minimax 2.5 brain active)");

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

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    return m + ":" + (s % 60).toString().padStart(2, "0");
  };

  const hbStatus = metaState?.heartbeat?.status || "idle";
  const llmConnected = metaState?.llm_connected || false;
  const hbError = metaState?.heartbeat?.error || null;

  if (!metaState) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif", flexDirection: "column", gap: 12 }}>
        {error ? (
          <>
            <span style={{ color: "#ef4444" }}>{error}</span>
            <button onClick={() => { setError(null); fetchState(); }} style={{ background: "#27272a", color: "#f4f4f5", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>Retry</button>
          </>
        ) : "Loading..."}
      </div>
    );
  }

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
                Karpathy-style self-improvement — Minimax 2.5 brain
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* LLM Connection Status */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              background: llmConnected ? "#14532d" : "#7f1d1d", borderRadius: 8, fontSize: 12,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: llmConnected ? "#4ade80" : "#f87171",
                boxShadow: llmConnected ? "0 0 6px #4ade80" : "none",
              }} />
              {llmConnected ? "Minimax 2.5 Connected" : "LLM Disconnected"}
            </div>
            <a href="/henry" style={{ padding: "8px 16px", background: "#27272a", borderRadius: 8, color: "#f4f4f5", textDecoration: "none" }}>
              Henry
            </a>
            <a href="/" style={{ padding: "8px 16px", background: "#27272a", borderRadius: 8, color: "#f4f4f5", textDecoration: "none" }}>
              Dashboard
            </a>
          </div>
        </div>

        {/* Error banner */}
        {(error || hbError) && (
          <div style={{ background: "#7f1d1d", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
            <span>{error || hbError}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f4f4f5", cursor: "pointer" }}>x</button>
          </div>
        )}

        {/* Heartbeat Status Bar */}
        {hbStatus !== "idle" && (
          <div style={{
            background: "#1e1b4b", border: "1px solid #4338ca", borderRadius: 8,
            padding: "8px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 13,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#818cf8",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <span style={{ color: "#a5b4fc" }}>
              {hbStatus === "proposing" && "Minimax 2.5 is proposing an improvement..."}
              {hbStatus === "evaluating" && "Minimax 2.5 is evaluating the change..."}
              {hbStatus === "deciding" && "Deciding: keep or discard..."}
              {hbStatus === "error" && "Error in experiment cycle"}
            </span>
            {metaState?.heartbeat?.current_experiment && (
              <span style={{ color: "#71717a", marginLeft: 8 }}>({metaState.heartbeat.current_experiment})</span>
            )}
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
            Every 5 min: Minimax 2.5 reads route code (train.py) → proposes improvement → evaluates quality → keeps if score improved, discards if not.
            Real Karpathy autoresearch — the LLM modifies the program it's improving.
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
              <Zap size={16} /> Run Single
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
            <div style={{ background: "#09090b", borderRadius: 8, padding: 16, maxHeight: 240, overflowY: "auto", fontFamily: "monospace", fontSize: 11 }}>
              {logs.map((l, i) => (
                <div key={i} style={{
                  padding: "2px 0",
                  color: l.includes("[+]") ? "#4ade80" : l.includes("[-]") ? "#f87171" : l.includes("KEPT") ? "#4ade80" : l.includes("DISCARDED") ? "#f87171" : i === 0 ? "#e2e8f0" : "#71717a",
                }}>{l}</div>
              ))}
            </div>
          )}
        </div>

        {/* Experiment History with Reasoning */}
        <div style={{ background: "#18181b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Terminal size={20} />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Experiment History</h2>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
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
                <div key={imp.id} style={{ background: "#27272a", borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
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
                    {imp.score_before != null && imp.score_after != null && (
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a1a1aa" }}>
                        {imp.score_before.toFixed(1)} → {imp.score_after.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {/* Show LLM reasoning */}
                  {imp.reasoning && (
                    <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 4, paddingLeft: 12, borderLeft: "2px solid #3f3f46" }}>
                      {imp.reasoning}
                    </div>
                  )}
                  {/* Show description */}
                  {imp.description && (
                    <div style={{ fontSize: 11, color: "#71717a", marginTop: 2, paddingLeft: 12 }}>
                      {imp.description}
                    </div>
                  )}
                  {/* Show code before/after for kept experiments */}
                  {imp.status === "completed" && imp.code_before && imp.code_after && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#f87171", marginBottom: 4 }}>BEFORE</div>
                        <div style={{
                          background: "#1a0000", borderRadius: 4, padding: 8, fontFamily: "monospace",
                          fontSize: 10, lineHeight: 1.4, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap",
                          color: "#fca5a5", border: "1px solid #7f1d1d",
                        }}>
                          {imp.code_before}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 4 }}>AFTER</div>
                        <div style={{
                          background: "#001a00", borderRadius: 4, padding: 8, fontFamily: "monospace",
                          fontSize: 10, lineHeight: 1.4, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap",
                          color: "#86efac", border: "1px solid #14532d",
                        }}>
                          {imp.code_after}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Live Code Viewer — the "train.py" */}
        <div style={{ background: "#18181b", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #27272a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Cpu size={20} color="#a855f7" />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Live Code (train.py)</h2>
            <span style={{ color: "#71717a", fontSize: 12, marginLeft: 8 }}>
              The code Minimax 2.5 is actively evolving
            </span>
          </div>

          {/* Target selector */}
          {metaState?.route_snapshots && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {Object.keys(metaState.route_snapshots).map((key: string) => (
                  <button key={key} onClick={() => setSelectedTarget(key)}
                    style={{
                      padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
                      background: selectedTarget === key ? "#7c3aed" : "#27272a",
                      color: selectedTarget === key ? "white" : "#a1a1aa",
                    }}>
                    {key}
                  </button>
                ))}
              </div>
              <div style={{
                background: "#09090b", borderRadius: 8, padding: 16, maxHeight: 300, overflowY: "auto",
                fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#e2e8f0",
                border: "1px solid #27272a",
              }}>
                {metaState.route_snapshots[selectedTarget] || "Select a target above"}
              </div>
            </>
          )}
        </div>

        {/* Manual Controls */}
        <div style={{ background: "#18181b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Wrench size={20} color="#a855f7" />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Manual Controls</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Proposed", value: metaState?.proposed_count ?? 0, color: "#f4f4f5" },
              { label: "In Progress", value: metaState?.in_progress_count ?? 0, color: "#facc15" },
              { label: "Failed", value: metaState?.total_failed ?? 0, color: "#f87171" },
              { label: "Targets", value: metaState?.route_targets?.length ?? 0, color: "#60a5fa" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#27272a", borderRadius: 8, padding: 16 }}>
                <div style={{ color: "#a1a1aa", fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button onClick={() => metaAction("propose")} disabled={loading} style={{ padding: "8px 16px", background: "#7c3aed", borderRadius: 8, border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.5 : 1 }}>
              <Plus size={16} /> Propose (LLM)
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

      </div>
    </div>
  );
}
