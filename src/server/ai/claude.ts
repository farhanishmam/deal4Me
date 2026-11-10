import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  query,
  startup,
  type Options,
  type Query,
  type SDKResultMessage,
  type SDKUserMessage,
  type WarmQuery,
} from "@anthropic-ai/claude-agent-sdk";

// Every AI call in the backend goes through askClaude, which runs a headless
// Claude Code session. Auth is whatever the CLI resolves: ANTHROPIC_API_KEY when
// set (for example in .env.local), otherwise the `claude auth login` session.

export type ClaudeModel = "haiku" | "sonnet";
export type ClaudeEffort = "low" | "medium" | "high";
export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface ClaudeCall {
  /** Keep this constant per feature: warm sessions are keyed on it. */
  system: string;
  prompt: string;
  model?: ClaudeModel;
  effort?: ClaudeEffort;
  /** JSON Schema (draft-07). The parsed object comes back as `data`. */
  schema?: Record<string, unknown>;
  image?: { mediaType: ImageMediaType; base64: string };
  /** Several images, shown to Claude in this order, before `prompt`. */
  images?: { mediaType: ImageMediaType; base64: string }[];
  /** Built-in tools to allow, such as ["WebSearch"]. Off by default. */
  tools?: string[];
  timeoutMs?: number;
}

export interface ClaudeResult<T> {
  /** The reply text. With a schema, this is the JSON string. */
  text: string;
  /** The schema-validated object, or the text when no schema was given. */
  data: T;
  ms: number;
  costUsd: number;
}

export class ClaudeError extends Error {
  constructor(message: string, public readonly kind: "auth" | "timeout" | "service" = "service") {
    super(message);
    this.name = "ClaudeError";
  }
}

function callError(detail: string): ClaudeError {
  if (/authentication|not logged in|login|log in|api.?key|credential|oauth|unauthorized|401/i.test(detail)) {
    return new ClaudeError("AI is not connected. Set ANTHROPIC_API_KEY in .env.local or run claude auth login, then restart the app.", "auth");
  }
  return new ClaudeError("The AI service could not complete this request. Please try again.");
}

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_SPARES = 4;

function workDir(): string {
  // An empty folder, so a session never picks up this repo's files.
  const dir = join(tmpdir(), "claude-backend-sessions");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // A dev server started from inside Claude Code inherits these, and they break the child's login.
    if (value === undefined || key === "CLAUDECODE" || key.startsWith("CLAUDE_CODE_") || key.startsWith("CLAUDE_AGENT_SDK_")) continue;
    env[key] = value;
  }
  return { ...env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1", CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1", CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1" };
}

function optionsFor(call: ClaudeCall): Options {
  const tools = call.tools ?? [];
  return {
    model: call.model ?? "haiku",
    effort: call.effort ?? "low",
    systemPrompt: call.system,
    tools,
    allowedTools: tools,
    // Without this the session loads ~/.claude hooks, plugins and CLAUDE.md.
    settingSources: [],
    strictMcpConfig: true,
    skills: [],
    persistSession: false,
    maxTurns: tools.length > 0 ? 8 : 3,
    cwd: workDir(),
    env: childEnv(),
    ...(call.schema ? { outputFormat: { type: "json_schema" as const, schema: call.schema } } : {}),
  };
}

// A spare is a started session waiting for its one prompt, which skips process
// start. Kept on globalThis so dev reloads do not orphan the subprocesses.
const pool = ((globalThis as { __claudeSpares?: Map<string, Promise<WarmQuery>> }).__claudeSpares ??= new Map<string, Promise<WarmQuery>>());

const poolKey = (call: ClaudeCall) => JSON.stringify([call.system, call.model, call.effort, call.schema]);

function refill(key: string, options: Options) {
  if (pool.has(key)) return;
  if (pool.size >= MAX_SPARES) {
    const oldest = pool.keys().next().value as string;
    void pool.get(oldest)?.then((spare) => spare.close()).catch(() => {});
    pool.delete(oldest);
  }
  const spare = startup({ options });
  spare.catch(() => pool.delete(key));
  pool.set(key, spare);
}

/** Starts a session ahead of time, so the first real call for this feature is fast. */
export function warmClaude(call: Pick<ClaudeCall, "system" | "model" | "effort" | "schema">): void {
  const full = { ...call, prompt: "" };
  refill(poolKey(full), optionsFor(full));
}

function promptFor(call: ClaudeCall): string | AsyncIterable<SDKUserMessage> {
  const images = call.images ?? (call.image ? [call.image] : []);
  if (images.length === 0) return call.prompt;
  const message = {
    type: "user",
    parent_tool_use_id: null,
    message: {
      role: "user",
      content: [
        ...images.map(({ mediaType, base64 }) => ({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } })),
        { type: "text", text: call.prompt },
      ],
    },
  } as SDKUserMessage;
  return (async function* () {
    yield message;
  })();
}

async function firstResult(session: Query, timeoutMs: number): Promise<SDKResultMessage> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ClaudeError("The AI service took too long. Please try again.", "timeout")), timeoutMs);
  });
  const read = (async () => {
    for await (const message of session) {
      if (message.type === "assistant" && message.error) throw callError(message.error);
      if (message.type === "result") return message;
    }
    throw new ClaudeError("Claude session ended without a result");
  })();
  try {
    return await Promise.race([read, timeout]);
  } finally {
    clearTimeout(timer);
    session.close();
  }
}

export async function askClaude<T = string>(call: ClaudeCall): Promise<ClaudeResult<T>> {
  const started = Date.now();
  const timeoutMs = call.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const options = optionsFor(call);
  const canWarm = !call.tools?.length;
  const key = poolKey(call);
  const spare = canWarm ? pool.get(key) : undefined;
  if (spare) pool.delete(key);

  let result: SDKResultMessage;
  try {
    const session = spare ? (await spare).query(promptFor(call)) : query({ prompt: promptFor(call), options });
    result = await firstResult(session, timeoutMs);
  } catch (error) {
    // A spare can go stale while it waits, so give it one cold retry.
    if (!spare || error instanceof ClaudeError) throw error instanceof ClaudeError ? error : callError(String(error));
    try {
      result = await firstResult(query({ prompt: promptFor(call), options }), timeoutMs);
    } catch (retryError) {
      throw retryError instanceof ClaudeError ? retryError : callError(String(retryError));
    }
  }
  if (result.subtype !== "success" || result.is_error) {
    throw callError(result.subtype === "success" ? result.result : result.errors.join(" "));
  }
  if (call.schema && result.structured_output === undefined) {
    throw new ClaudeError("Claude returned no structured output");
  }
  if (canWarm) refill(key, options);
  return {
    text: result.result,
    data: (call.schema ? result.structured_output : result.result) as T,
    ms: Date.now() - started,
    costUsd: result.total_cost_usd,
  };
}
