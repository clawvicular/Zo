import { useState, useEffect, useRef } from "react";

// ============================================================================
// Henry — Chief Orchestrator Chat Interface
// ============================================================================

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Henry", href: "/henry" },
  { label: "Activity", href: "/activity" },
  { label: "Tasks", href: "/tasks" },
  { label: "Memories", href: "/memories" },
  { label: "Team", href: "/team" },
  { label: "Calendar", href: "/calendar" },
  { label: "Projects", href: "/projects" },
  { label: "Search", href: "/search" },
  { label: "AutoResearch", href: "/autoresearch" },
];

function Nav({ current }: { current: string }) {
  return (
    <nav style={{ display: "flex", gap: 4, padding: "12px 0", borderBottom: "1px solid #27272a", marginBottom: 24, flexWrap: "wrap" }}>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: current === item.href ? 600 : 400,
            color: current === item.href ? "#f4f4f5" : "#a1a1aa",
            background: current === item.href ? "#27272a" : "transparent",
            textDecoration: "none",
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

type ActionResult = {
  tool: string;
  params: Record<string, any>;
  result: string;
  success: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: ActionResult[];
  thinking?: string;
  timestamp: string;
};

const QUICK_ACTIONS = [
  { label: "System Status", message: "What's the current system status?" },
  { label: "Show Tasks", message: "Show me all active tasks" },
  { label: "Recent Activity", message: "What's been happening recently?" },
  { label: "Help", message: "What can you do? List your capabilities." },
];

const TOOL_COLORS: Record<string, string> = {
  get_status: "#3b82f6",
  create_task: "#4ade80",
  update_task: "#facc15",
  search: "#a78bfa",
  add_memory: "#f472b6",
  log_activity: "#38bdf8",
  set_mission: "#fb923c",
  delegate: "#c084fc",
  web_fetch: "#2dd4bf",
  run_shell: "#94a3b8",
};

function ToolCallCard({ action }: { action: ActionResult }) {
  const [expanded, setExpanded] = useState(false);
  const color = TOOL_COLORS[action.tool] || "#71717a";

  return (
    <div
      style={{
        background: "#0a0a0b",
        border: `1px solid ${action.success ? "#166534" : "#7f1d1d"}`,
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 6,
        fontSize: 12,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ background: color, color: "#000", padding: "2px 8px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
          {action.tool}
        </span>
        <span style={{ color: action.success ? "#4ade80" : "#ef4444", fontSize: 11 }}>
          {action.success ? "success" : "error"}
        </span>
        <span style={{ marginLeft: "auto", color: "#52525b", fontSize: 11 }}>{expanded ? "collapse" : "expand"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: "#71717a", marginBottom: 4 }}>Params:</div>
          <pre style={{ margin: 0, color: "#a1a1aa", whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 11 }}>
            {JSON.stringify(action.params, null, 2)}
          </pre>
          <div style={{ color: "#71717a", marginTop: 8, marginBottom: 4 }}>Result:</div>
          <pre style={{ margin: 0, color: "#d4d4d8", whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 11, maxHeight: 200, overflow: "auto" }}>
            {action.result.slice(0, 2000)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function Henry() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"ready" | "processing" | "error">("ready");
  const [heartbeat, setHeartbeat] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history + heartbeat state on mount, poll every 30s
  useEffect(() => {
    function loadState() {
      fetch("/api/chat-henry")
        .then((r) => r.json())
        .then((data) => {
          if (data.history?.length) setMessages(data.history);
          setStatus(data.status || "ready");
          if (data.heartbeat) setHeartbeat(data.heartbeat);
        })
        .catch(() => {});
    }
    loadState();
    const interval = setInterval(loadState, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(msg?: string) {
    const text = (msg || input).trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setStatus("processing");

    // Optimistic user message
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat-henry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error, timestamp: new Date().toISOString() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            actions: data.actions,
            thinking: data.thinking,
            timestamp: data.timestamp,
          },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Connection error: ${e.message}`, timestamp: new Date().toISOString() },
      ]);
    }

    setLoading(false);
    setStatus("ready");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function clearHistory() {
    await fetch("/api/chat-henry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    }).catch(() => {});
    setMessages([]);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", flexShrink: 0 }}>
        <Nav current="/henry" />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{"\u{1F451}"}</span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Henry</h1>
            <span style={{ fontSize: 12, color: "#71717a" }}>Chief Orchestrator</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* Heartbeat indicator */}
            {heartbeat && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: heartbeat.active ? "#4ade80" : "#ef4444",
                  animation: heartbeat.active ? "pulse 2s infinite" : "none",
                }} />
                <span style={{ fontSize: 11, color: "#71717a" }}>
                  Heartbeat {heartbeat.active ? "ON" : "OFF"} ({heartbeat.total_beats} beats)
                </span>
                <button
                  onClick={() => {
                    fetch("/api/chat-henry", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: heartbeat.active ? "heartbeat_stop" : "heartbeat_start" }),
                    }).then(() => {
                      setHeartbeat((h: any) => h ? { ...h, active: !h.active } : h);
                    }).catch(() => {});
                  }}
                  style={{ background: "transparent", border: "1px solid #27272a", color: heartbeat.active ? "#ef4444" : "#4ade80", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10 }}
                >
                  {heartbeat.active ? "Stop" : "Start"}
                </button>
              </div>
            )}
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: status === "ready" ? "#4ade80" : status === "processing" ? "#facc15" : "#ef4444",
            }} />
            <span style={{ fontSize: 12, color: "#71717a" }}>{status}</span>
            <button
              onClick={clearHistory}
              style={{ background: "transparent", border: "1px solid #27272a", color: "#71717a", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, marginLeft: 8 }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#52525b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{"\u{1F451}"}</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Henry is ready to orchestrate.</div>
            <div style={{ fontSize: 13 }}>Ask me anything about Mission Control, or tell me to do something.</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                background: msg.role === "user" ? "#1e3a5f" : "#18181b",
                border: msg.role === "user" ? "1px solid #1e40af" : "1px solid #27272a",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "12px 16px",
              }}
            >
              {msg.role === "assistant" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{"\u{1F451}"}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa" }}>Henry</span>
                </div>
              )}

              {/* Thinking (collapsible) */}
              {msg.thinking && <ThinkingBlock text={msg.thinking} />}

              {/* Tool calls */}
              {msg.actions && msg.actions.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {msg.actions.map((action, j) => (
                    <ToolCallCard key={j} action={action} />
                  ))}
                </div>
              )}

              {/* Message content */}
              <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {msg.content}
              </div>

              <div style={{ fontSize: 10, color: "#52525b", marginTop: 6, textAlign: "right" }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{"\u{1F451}"}</span>
                <span style={{ fontSize: 13, color: "#a1a1aa" }}>Henry is thinking...</span>
                <span style={{ animation: "pulse 1.5s infinite", display: "inline-block" }}>{"\u{2728}"}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div style={{ padding: "0 24px 8px", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => sendMessage(qa.message)}
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#a1a1aa",
                borderRadius: 20,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => { (e.target as HTMLElement).style.borderColor = "#3b82f6"; (e.target as HTMLElement).style.color = "#f4f4f5"; }}
              onMouseOut={(e) => { (e.target as HTMLElement).style.borderColor = "#27272a"; (e.target as HTMLElement).style.color = "#a1a1aa"; }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div style={{ padding: "12px 24px 20px", borderTop: "1px solid #27272a", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Henry what to do..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#f4f4f5",
              fontSize: 14,
              resize: "none",
              fontFamily: "inherit",
              outline: "none",
              minHeight: 44,
              maxHeight: 120,
            }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#3b82f6"; }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#27272a"; }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "#27272a" : "#3b82f6",
              border: "none",
              borderRadius: 12,
              padding: "12px 20px",
              color: loading || !input.trim() ? "#52525b" : "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Send
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 6, textAlign: "center" }}>
          Enter to send, Shift+Enter for newline. Henry uses Minimax 2.5.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{ fontSize: 12, color: "#52525b", fontStyle: "italic", marginBottom: 6, cursor: "pointer" }}
      onClick={() => setExpanded(!expanded)}
    >
      {expanded ? text : `Thinking: ${text.slice(0, 60)}${text.length > 60 ? "..." : ""}`}
    </div>
  );
}
