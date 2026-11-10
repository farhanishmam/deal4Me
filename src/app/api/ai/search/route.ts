import { z } from "zod";
import { searchCatalog } from "@/server/ai/search";
import { aiFailure } from "@/server/ai/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  query: z.string().trim().min(1).max(500),
  lang: z.enum(["en", "ja", "es", "fr", "de", "ko", "zh"]).optional(),
  budgetCents: z.number().int().positive().max(100_000_000).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  size: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const body = Body.safeParse(json);
  if (!body.success) return Response.json({ error: "Send a query string and optional lang and budgetCents." }, { status: 400 });
  try {
    const result = await searchCatalog({
      query: body.data.query,
      lang: body.data.lang,
      budgetCents: body.data.budgetCents,
      startsAt: body.data.startsAt,
      endsAt: body.data.endsAt,
      size: body.data.size,
    });
    return Response.json(result);
  } catch (error) {
    return aiFailure(error, "Search could not finish. Please try again.");
  }
}
