import { useStore } from "@/lib/store";
import type { Actor } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function check(res: Response): Promise<Response> {
  if (res.ok) return res;
  const body = await res.json().catch(() => null);
  throw new ApiError(body?.error ?? `Request failed: ${res.status}`, res.status);
}

export async function postJson<T>(path: string, body: unknown, options?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  return (await check(res)).json();
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  return (await check(await fetch(path, { method: "POST", body: form }))).json();
}

/** POSTs JSON and calls `onLine` for each object of an NDJSON response. */
export async function postNdjson<T>(path: string, body: unknown, onLine: (line: T) => void, options?: { signal?: AbortSignal }): Promise<void> {
  const res = await check(
    await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: options?.signal,
    }),
  );
  if (!res.body) throw new ApiError("Empty response", res.status);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onLine(JSON.parse(line) as T);
    }
    if (buffer.trim()) onLine(JSON.parse(buffer) as T);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function logStep(actor: Actor, action: string, detail?: string, latencyMs?: number, costUsd?: number) {
  useStore.getState().logStep({ actor, action, detail, latencyMs, costUsd });
}

