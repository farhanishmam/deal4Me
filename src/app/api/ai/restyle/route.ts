import { z } from "zod";
import { parseSiteUrl, restyle, RestyleInputError, WebsiteReadError } from "@/server/ai/restyle";
import { aiErrorMessage } from "@/server/ai/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  url: z.string().min(1).max(2000),
  name: z.string().max(200).optional(),
  sections: z.array(z.object({ id: z.string(), title: z.string(), itemIds: z.array(z.string()) })).max(30).optional(),
});

const bad = (error: string) => Response.json({ error }, { status: 400 });

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return bad("Send a JSON body");
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return bad("Send a url, and optionally a name and sections");
  try {
    parseSiteUrl(parsed.data.url);
  } catch (e) {
    return bad(e instanceof RestyleInputError ? e.message : "Invalid url");
  }

  const encoder = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => {
        if (!disconnected) controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      };
      try {
        const result = await restyle(parsed.data, (label) => send({ type: "step", label }));
        send({ type: "result", result });
      } catch (e) {
        send({ type: "error", error: e instanceof WebsiteReadError || e instanceof RestyleInputError
          ? e.message
          : aiErrorMessage(e, "Could not read items from that site. Try a direct menu or shop link.") });
      }
      if (!disconnected) controller.close();
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
