import { ClaudeError } from "@/server/ai/claude";

/** Share safe, actionable connection errors without returning provider output or credentials. */
export function aiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ClaudeError ? error.message : fallback;
}

export function aiFailure(error: unknown, fallback: string): Response {
  const status = error instanceof ClaudeError && error.kind === "auth" ? 503 : 502;
  return Response.json({ error: aiErrorMessage(error, fallback) }, { status });
}
