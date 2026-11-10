import { z } from "zod";
import type { Negotiation } from "@/lib/types";
import { ownerOpening } from "@/server/deals/agents";
import { newDealState } from "@/server/deals/rules";
import { deals, listNegotiations } from "@/server/deals/store";
import { DealInputError, dealBackground, itemForDeal } from "@/server/deals/catalog";
import { aiFailure } from "@/server/ai/errors";
import { dataError } from "@/server/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  itemId: z.string().trim().min(1).max(100),
  visitorMaxCents: z.number().int().positive().max(100_000_000).optional(),
  days: z.number().int().min(1).max(60).optional(),
  lang: z.enum(["en", "ja", "es", "fr", "de", "ko", "zh"]).optional(),
});

export async function GET() {
  try {
    return Response.json({ negotiations: listNegotiations() });
  } catch (error) {
    return dataError(error);
  }
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 });
  const { itemId, lang = "en", visitorMaxCents } = parsed.data;
  let item;
  try {
    item = itemForDeal(itemId, parsed.data.days ?? 1);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load item." }, { status: error instanceof DealInputError ? error.status : 500 });
  }
  const { kind, days } = item;

  const state = newDealState(item.listCents, item.floorCents, 6);
  const askingCents = state.askCents;
  let opening;
  try {
    opening = await ownerOpening({ background: dealBackground(itemId, item.name, kind), askCents: askingCents, days, lang });
  } catch (error) {
    return aiFailure(error, "The owner agent could not greet you. Please try again.");
  }

  const id = `neg-${crypto.randomUUID()}`;
  const negotiation: Negotiation = {
    id,
    itemId,
    days,
    askingCents,
    visitorMaxCents: visitorMaxCents ?? askingCents,
    rounds: [{ n: 1, by: "owner", offerCents: askingCents, message: opening.message, at: new Date().toISOString() }],
    maxRounds: 6,
    mode: "manual",
    status: "running",
    kind,
  };
  try {
    deals.set(id, { negotiation, state, itemName: item.name, lang });
  } catch (error) {
    return dataError(error);
  }
  return Response.json({ negotiation });
}
