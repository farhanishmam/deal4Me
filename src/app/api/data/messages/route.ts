import { appendMessage, PostMessageSchema, readThreads } from "@/server/data/conversations";
import { dataError } from "@/server/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ threads: readThreads() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return dataError(error); }
}

export async function POST(request: Request) {
  const parsed = PostMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  try {
    return Response.json(appendMessage(parsed.data), { status: 201 });
  } catch (error) { return dataError(error); }
}
