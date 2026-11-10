import { z } from "zod";
import { ChatSchema, readChats, upsertChat } from "@/server/data/conversations";
import { dataError } from "@/server/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ chats: readChats() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return dataError(error); }
}

export async function PUT(request: Request) {
  const parsed = z.object({ chat: ChatSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid chat" }, { status: 400 });
  try {
    return Response.json(upsertChat(parsed.data.chat));
  } catch (error) { return dataError(error); }
}
