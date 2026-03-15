import type { Context } from "hono";

// ============================================================================
// Henry — Chief Orchestrator Agent Brain
// Agentic tool-calling loop powered by Minimax 2.5
// Autonomous 24/7 operation with heartbeat + chat interface
// ============================================================================

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: ActionResult[];
  timestamp: string;
};

type ActionResult = {
  tool: string;
  params: Record<string, any>;
  result: string;
  success: boolean;
};

// In-memory conversation state
let conversationHistory: ChatMessage[] = [];
let isProcessing = false;

// Heartbeat state
let heartbeatActive = false;
let heartbeatInterval: any = null;
let heartbeatLog: { timestamp: string; summary: string; actions: number }[] = [];
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Soul.md content — loaded lazily on first use
let soulContent = "";
let soulLoaded = false;

async function loadSoul(): Promise<string> {
  if (soulLoaded) return soulContent;
  try {
    const soulPath = new URL("./soul.md", import.meta.url).pathname;
    soulContent = await Bun.file(soulPath).text();
  } catch {
    soulContent = "You are Henry, the Chief Orchestrator. You ACT, not just chat. You coordinate sub-agents and drive the mission forward 24/7.";
  }
  soulLoaded = true;
  return soulContent;
}

// Determine the data API base URL (same server)
function getBaseUrl(): string {
  const port = (globalThis as any).process?.env?.PORT || "3111";
  return `http://localhost:${port}`;
}

// ============================================================================
// LLM call — same pattern as meta-improve.ts
// ============================================================================

async function callLLM(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string | null> {
  const apiKey = (globalThis as any).process?.env?.ZO_API_KEY
    || (globalThis as any).process?.env?.MINIMAX_API_KEY
    || (globalThis as any).process?.env?.ZO_CLIENT_IDENTITY_TOKEN;

  const baseUrl = (globalThis as any).process?.env?.LLM_BASE_URL || "https://api.minimax.io/v1";

  if (!apiKey) return null;

  // Reject JWTs and tokens with control chars
  if (/[\r\n\x00-\x1f]/.test(apiKey) || apiKey.startsWith("eyJ")) return null;

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
          ...messages,
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return null;

    const text = await res.text();
    const data = JSON.parse(text);
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

const SAFE_COMMANDS = ["ls", "cat", "head", "tail", "date", "uptime", "whoami", "pwd", "echo", "wc", "df", "du", "find"];
const BLOCKED_PATTERNS = ["|", ">", "<", ";", "&&", "||", "`", "$(", "rm", "sudo", "chmod", "chown", "kill", "mkfs", "dd", "mv", "cp"];

async function executeTool(tool: string, params: Record<string, any>): Promise<{ result: string; success: boolean }> {
  const base = getBaseUrl();

  try {
    switch (tool) {
      case "get_status": {
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_full_status" }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data, null, 2), success: true };
      }

      case "create_task": {
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_task",
            title: params.title || "New task",
            assignee: params.assignee || "",
            priority: params.priority || "medium",
            project: params.project || "",
            status: params.status || "inbox",
          }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data), success: data.ok };
      }

      case "update_task": {
        const updateBody: Record<string, any> = { action: "update_task", task_id: params.task_id };
        if (params.status !== undefined) updateBody.status = params.status;
        if (params.assignee !== undefined) updateBody.assignee = params.assignee;
        if (params.priority !== undefined) updateBody.priority = params.priority;
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data), success: data.ok };
      }

      case "search": {
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "global_search", query: params.query || "" }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data.results?.slice(0, 10) || [], null, 2), success: true };
      }

      case "add_memory": {
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_memory",
            agent: "Henry",
            type: params.type || "note",
            content: params.content || "",
            tags: params.tags || [],
          }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data), success: data.ok };
      }

      case "log_activity": {
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_activity",
            agent: "Henry",
            activity_action: params.action || "note",
            detail: params.detail || "",
            tokens_used: params.tokens_used || 0,
          }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data), success: data.ok };
      }

      case "set_mission": {
        const res = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_mission", mission: params.mission }),
        });
        const text = await res.text();
        const data = JSON.parse(text);
        return { result: JSON.stringify(data), success: data.ok };
      }

      case "delegate": {
        // Delegation = create task assigned to target agent + log activity
        const taskRes = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_task",
            title: params.task || params.title || "Delegated task",
            assignee: params.agent || params.assignee || "",
            priority: params.priority || "medium",
            project: params.project || "",
            status: "assigned",
          }),
        });
        const taskText = await taskRes.text();
        const taskData = JSON.parse(taskText);

        await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_activity",
            agent: "Henry",
            activity_action: "delegate",
            detail: `Delegated "${params.task || params.title}" to ${params.agent || params.assignee}`,
            tokens_used: 0,
          }),
        });

        return { result: JSON.stringify(taskData), success: taskData.ok };
      }

      case "web_fetch": {
        const url = params.url;
        if (!url) return { result: "Error: url is required", success: false };

        try {
          const parsed = new URL(url);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return { result: "Error: Only HTTP/HTTPS URLs supported", success: false };
          }
        } catch {
          return { result: "Error: Invalid URL", success: false };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "HenryBot/1.0" },
          });
          clearTimeout(timeout);
          const text = await res.text();
          const truncated = text.slice(0, 8000);

          if (params.prompt) {
            const summary = await callLLM(
              "You are a web content analyzer. Extract the requested information concisely.",
              [{ role: "user", content: `URL: ${url}\nContent:\n${truncated}\n\nExtract: ${params.prompt}` }]
            );
            return { result: summary || truncated, success: true };
          }

          return { result: truncated, success: true };
        } catch (e: any) {
          clearTimeout(timeout);
          return { result: `Error fetching ${url}: ${e.message}`, success: false };
        }
      }

      case "run_shell": {
        const command = (params.command || "").trim();
        if (!command) return { result: "Error: command is required", success: false };

        const parts = command.split(/\s+/);
        const cmd = parts[0];

        if (!SAFE_COMMANDS.includes(cmd)) {
          return { result: `Error: "${cmd}" not allowed. Safe: ${SAFE_COMMANDS.join(", ")}`, success: false };
        }
        for (const pattern of BLOCKED_PATTERNS) {
          if (command.includes(pattern)) {
            return { result: `Error: blocked pattern "${pattern}"`, success: false };
          }
        }

        try {
          const proc = Bun.spawn(parts, { stdout: "pipe", stderr: "pipe" });
          const stdout = await new Response(proc.stdout).text();
          const stderr = await new Response(proc.stderr).text();

          let killTimer: any;
          const exitCode = await Promise.race([
            proc.exited,
            new Promise<number>((_, reject) => {
              killTimer = setTimeout(() => { proc.kill(); reject(new Error("Timeout after 5s")); }, 5000);
            }),
          ]);
          clearTimeout(killTimer);

          const output = (stdout + (stderr ? "\nSTDERR: " + stderr : "")).slice(0, 2000);
          return { result: output || "(no output)", success: exitCode === 0 };
        } catch (e: any) {
          return { result: `Error: ${e?.message || "unknown"}`, success: false };
        }
      }

      default:
        return { result: `Unknown tool: ${tool}`, success: false };
    }
  } catch (e: any) {
    return { result: `Tool error: ${e.message}`, success: false };
  }
}

// ============================================================================
// Build system prompt with live state
// ============================================================================

async function buildSystemPrompt(systemState: any): Promise<string> {
  const soul = await loadSoul();
  const agentList = (systemState?.agents || [])
    .map((a: any) => `  - ${a.name} (${a.role}) — ${a.status}, ${a.tasks_active} active tasks`)
    .join("\n");

  const projectList = (systemState?.projects || [])
    .map((p: any) => `  - ${p.name}: ${p.status}, ${p.progress}% complete, due ${p.deadline}`)
    .join("\n");

  const recentActivity = (systemState?.recent_activities || [])
    .slice(0, 5)
    .map((a: any) => `  - ${a.agent}: ${a.action} — ${a.detail}`)
    .join("\n");

  const tasksSummary = systemState?.tasks_summary
    ? Object.entries(systemState.tasks_summary).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "unknown";

  return `${soul}

## Current State
- Date: ${new Date().toISOString().split("T")[0]}
- Mission: ${systemState?.mission || "Not set"}
- Agents:\n${agentList || "  (none loaded)"}
- Tasks: ${tasksSummary} (${systemState?.tasks_total || 0} total)
- Projects:\n${projectList || "  (none)"}
- Recent Activity:\n${recentActivity || "  (none)"}
- Memories: ${systemState?.memories_count || 0}

## Available Tools
Return your response as a JSON object. If you need to use tools, include them in the "actions" array. You can chain multiple actions.

\`\`\`
{
  "thinking": "Your internal reasoning (optional)",
  "actions": [
    { "tool": "tool_name", "params": { ... } }
  ],
  "response": "Your natural language response to the user"
}
\`\`\`

If no tools are needed, you can set actions to [].

### Tool: get_status
Get full system status (agents, tasks, projects, recent activity).
Params: {} (none required)

### Tool: create_task
Create a real task in Mission Control.
Params: { "title": string, "assignee"?: string, "priority"?: "low"|"medium"|"high"|"urgent", "project"?: string }

### Tool: update_task
Update an existing task.
Params: { "task_id": string, "status"?: "inbox"|"assigned"|"in_progress"|"review"|"done", "assignee"?: string, "priority"?: string }

### Tool: search
Search all Mission Control data (agents, tasks, memories, projects, documents, activities).
Params: { "query": string }

### Tool: add_memory
Store a memory entry for future reference.
Params: { "content": string, "type"?: string, "tags"?: string[] }

### Tool: log_activity
Log an action to the activity feed.
Params: { "action": string, "detail": string, "tokens_used"?: number }

### Tool: set_mission
Update the mission statement.
Params: { "mission": string }

### Tool: delegate
Assign a task to a specific agent.
Params: { "agent": string, "task": string, "priority"?: string, "project"?: string }

### Tool: web_fetch
Fetch content from a URL.
Params: { "url": string, "prompt"?: string }

### Tool: run_shell
Execute a read-only shell command (ls, cat, head, tail, date, uptime, whoami, pwd, echo, wc, df, du, find only).
Params: { "command": string }

## Rules
1. ALWAYS use tools when the user asks you to DO something — create tasks, search, check status, etc.
2. Use get_status BEFORE answering questions about the system state.
3. Log important actions via log_activity.
4. When delegating work, use the delegate tool with the target agent name.
5. Be proactive — if asked "how are things?", fetch status first.
6. NEVER fabricate data — always fetch it first.
7. Keep responses concise and actionable.
8. You are the BOSS — coordinate, delegate, and drive outcomes.`;
}

// ============================================================================
// Parse Henry's response — robust JSON extraction
// ============================================================================

function parseHenryResponse(raw: string): { thinking?: string; actions: { tool: string; params: Record<string, any> }[]; response: string } {
  // Try parsing as pure JSON first
  try {
    const parsed = JSON.parse(raw);
    return {
      thinking: parsed.thinking,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      response: parsed.response || raw,
    };
  } catch { /* not pure JSON */ }

  // Try extracting JSON from code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]);
      return {
        thinking: parsed.thinking,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        response: parsed.response || raw,
      };
    } catch { /* bad JSON in fence */ }
  }

  // Try finding JSON object in the text
  const jsonMatch = raw.match(/\{[\s\S]*"response"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        thinking: parsed.thinking,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        response: parsed.response || raw,
      };
    } catch { /* bad JSON */ }
  }

  // Fallback: treat as plain text response
  return { actions: [], response: raw };
}

// ============================================================================
// Heartbeat — Autonomous 24/7 operation
// ============================================================================

async function runHeartbeat(): Promise<void> {
  if (isProcessing) return; // Don't overlap with chat
  isProcessing = true;

  try {
    // 1. Fetch current system state
    const base = getBaseUrl();
    let systemState: any = {};
    try {
      const stateRes = await fetch(`${base}/api/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_full_status" }),
      });
      const stateText = await stateRes.text();
      systemState = JSON.parse(stateText);
    } catch { /* proceed without state */ }

    // 2. Build heartbeat-specific prompt
    const systemPrompt = await buildSystemPrompt(systemState);
    const heartbeatPrompt = `This is an AUTONOMOUS HEARTBEAT cycle. You are running on your own — no human asked you to do anything.

Review the current system state above and decide what actions to take. You should:
1. Check on progress of active tasks and projects
2. Delegate work to sub-agents if needed
3. Create new tasks if the mission requires it
4. Log a brief summary of your observations
5. Address any urgent issues

If everything is running smoothly, just log a brief status observation and move on.

IMPORTANT: Always take at least one action (even if it's just log_activity with your observations).

Respond with JSON: { "thinking": "...", "actions": [...], "response": "..." }`;

    // 3. Call LLM
    const rawResponse = await callLLM(systemPrompt, [{ role: "user", content: heartbeatPrompt }]);

    if (!rawResponse) {
      heartbeatLog.push({
        timestamp: new Date().toISOString(),
        summary: "Heartbeat skipped — LLM unavailable",
        actions: 0,
      });
      return;
    }

    // 4. Parse and execute
    const parsed = parseHenryResponse(rawResponse);
    const actionResults: ActionResult[] = [];
    const actionsToRun = (parsed.actions || []).slice(0, 5);

    for (const action of actionsToRun) {
      if (action.tool && typeof action.tool === "string") {
        const result = await executeTool(action.tool, action.params || {});
        actionResults.push({
          tool: action.tool,
          params: action.params || {},
          result: result.result,
          success: result.success,
        });
      }
    }

    // 5. Log heartbeat activity
    const summary = parsed.thinking || parsed.response || "Heartbeat cycle completed";
    await fetch(`${base}/api/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_activity",
        agent: "Henry",
        activity_action: "heartbeat",
        detail: `[Autonomous] ${summary.slice(0, 150)} (${actionResults.length} actions)`,
        tokens_used: 0,
      }),
    }).catch(() => {});

    heartbeatLog.push({
      timestamp: new Date().toISOString(),
      summary: summary.slice(0, 200),
      actions: actionResults.length,
    });

    // Trim heartbeat log
    if (heartbeatLog.length > 100) {
      heartbeatLog = heartbeatLog.slice(-100);
    }
  } catch (e: any) {
    heartbeatLog.push({
      timestamp: new Date().toISOString(),
      summary: `Heartbeat error: ${e?.message || "unknown"}`,
      actions: 0,
    });
  } finally {
    isProcessing = false;
  }
}

function startHeartbeat(): void {
  if (heartbeatActive) return;
  heartbeatActive = true;
  heartbeatInterval = setInterval(() => {
    runHeartbeat().catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);
  // Run first heartbeat after 30s delay (let server fully boot)
  setTimeout(() => runHeartbeat().catch(() => {}), 30000);
}

function stopHeartbeat(): void {
  heartbeatActive = false;
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Auto-start heartbeat when module loads
startHeartbeat();

// ============================================================================
// HTTP Handler
// ============================================================================

export default async function handler(c: Context) {
  const method = c.req.method;

  // GET — return conversation history + heartbeat state
  if (method === "GET") {
    return c.json({
      history: conversationHistory,
      status: isProcessing ? "processing" : "ready",
      messageCount: conversationHistory.length,
      heartbeat: {
        active: heartbeatActive,
        interval_ms: HEARTBEAT_INTERVAL_MS,
        recent_log: heartbeatLog.slice(-10),
        total_beats: heartbeatLog.length,
      },
    });
  }

  // POST — chat message or clear
  if (method === "POST") {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Clear history
    if (body.action === "clear") {
      conversationHistory = [];
      return c.json({ ok: true });
    }

    // Heartbeat controls
    if (body.action === "heartbeat_start") {
      startHeartbeat();
      return c.json({ ok: true, heartbeat_active: true });
    }
    if (body.action === "heartbeat_stop") {
      stopHeartbeat();
      return c.json({ ok: true, heartbeat_active: false });
    }
    if (body.action === "heartbeat_now") {
      // Trigger an immediate heartbeat cycle
      runHeartbeat().catch(() => {});
      return c.json({ ok: true, message: "Heartbeat triggered" });
    }

    const userMessage = body.message;
    if (!userMessage || typeof userMessage !== "string") {
      return c.json({ error: "message is required" }, 400);
    }

    // Mutex — prevent concurrent processing
    if (isProcessing) {
      return c.json({ error: "Henry is thinking... please wait.", status: "processing" }, 429);
    }

    isProcessing = true;

    try {
      // 1. Fetch current system state
      const base = getBaseUrl();
      let systemState: any = {};
      try {
        const stateRes = await fetch(`${base}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_full_status" }),
        });
        const stateText = await stateRes.text();
        systemState = JSON.parse(stateText);
      } catch { /* proceed without state */ }

      // 2. Build system prompt
      const systemPrompt = await buildSystemPrompt(systemState);

      // 3. Add user message to history
      conversationHistory.push({
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      });

      // 4. Build messages for LLM (last 20 messages to stay within context)
      const recentMessages = conversationHistory.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 5. First LLM call: think + decide actions
      const rawResponse = await callLLM(systemPrompt, recentMessages);

      if (!rawResponse) {
        const fallbackMsg = "I'm currently unable to connect to my LLM brain (Minimax 2.5). Please check that ZO_API_KEY or MINIMAX_API_KEY is set. I'll be here when the connection is restored.";
        conversationHistory.push({
          role: "assistant",
          content: fallbackMsg,
          timestamp: new Date().toISOString(),
        });
        return c.json({ message: fallbackMsg, actions: [], timestamp: new Date().toISOString() });
      }

      // 6. Parse response
      const parsed = parseHenryResponse(rawResponse);

      // 7. Execute actions (max 5)
      const actionResults: ActionResult[] = [];
      const actionsToRun = (parsed.actions || []).slice(0, 5);

      for (const action of actionsToRun) {
        if (action.tool && typeof action.tool === "string") {
          const result = await executeTool(action.tool, action.params || {});
          actionResults.push({
            tool: action.tool,
            params: action.params || {},
            result: result.result,
            success: result.success,
          });
        }
      }

      // 8. If actions were taken, second LLM call with results
      let finalResponse = parsed.response;

      if (actionResults.length > 0) {
        const resultsText = actionResults
          .map((ar) => `Tool: ${ar.tool}\nResult (${ar.success ? "success" : "error"}): ${ar.result.slice(0, 1500)}`)
          .join("\n\n");

        const summaryResponse = await callLLM(
          "You are Henry, Chief Orchestrator. Summarize the results of your tool calls in a clear, helpful way for the user. Be concise. Do NOT return JSON — respond in plain text.",
          [
            { role: "user", content: userMessage },
            { role: "assistant", content: `I executed ${actionResults.length} tool(s). Here are the results:\n\n${resultsText}` },
            { role: "user", content: "Summarize what you found/did in a helpful response." },
          ]
        );

        if (summaryResponse) {
          finalResponse = summaryResponse;
        }
      }

      // 9. Store assistant response
      conversationHistory.push({
        role: "assistant",
        content: finalResponse,
        actions: actionResults.length > 0 ? actionResults : undefined,
        timestamp: new Date().toISOString(),
      });

      // 10. Trim history to last 50 messages
      if (conversationHistory.length > 50) {
        conversationHistory = conversationHistory.slice(-50);
      }

      // 11. Log activity (fire and forget)
      fetch(`${base}/api/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_activity",
          agent: "Henry",
          activity_action: "chat_response",
          detail: `Responded to: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? "..." : ""}" (${actionResults.length} tool calls)`,
          tokens_used: 0,
        }),
      }).catch(() => {});

      return c.json({
        message: finalResponse,
        thinking: parsed.thinking,
        actions: actionResults,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      return c.json({ error: `Henry error: ${e?.message || "unknown"}` }, 500);
    } finally {
      isProcessing = false;
    }
  }

  return c.json({ error: "Method not allowed" }, 405);
}
