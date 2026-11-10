import { z } from "zod";
import { findComps } from "@/server/ai/appraise";
import { aiFailure } from "@/server/ai/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  searchQuery: z.string().trim().min(1).max(200),
  kind: z.enum(["sale", "rental", "food"]).default("sale"),
  estimate: z.object({
    amountCents: z.number().int().positive(),
    rangeCents: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
    depositCents: z.number().int().nonnegative().optional(),
    reasoning: z.string().max(1000),
  }),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 });
  try {
    return Response.json(await findComps(parsed.data));
  } catch (error) {
    return aiFailure(error, "Could not find comparable prices. Please try again.");
  }
}
