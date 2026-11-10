import { z } from "zod";
import type { ItemRequest } from "@/lib/types";
import { availabilityIssue } from "@/server/availability";
import { DataError, dataError, readDataState, updateDataState } from "@/server/data/store";
import { deals } from "@/server/deals/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  itemId: z.string().trim().min(1).max(180),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  size: z.string().trim().min(1).max(80).optional(),
  negotiationId: z.string().trim().min(1).max(180).optional(),
});

export async function GET() {
  try { return Response.json(readDataState().itemRequests ?? []); }
  catch (error) { return dataError(error); }
}

const Patch = z.object({ id: z.string().trim().min(1).max(180), status: z.literal("confirmed") });

export async function PATCH(request: Request) {
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  try {
    const saved = updateDataState((state) => {
      const found = state.itemRequests?.find((entry) => entry.id === parsed.data.id);
      if (!found) throw new DataError("Request not found", 404);
      found.status = parsed.data.status;
      return found;
    });
    return Response.json(saved);
  } catch (error) { return dataError(error); }
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  try {
    // The agreed price always comes from the saved deal, never from the client.
    const deal = parsed.data.negotiationId ? deals.get(parsed.data.negotiationId)?.negotiation : undefined;
    if (parsed.data.negotiationId && (deal?.status !== "deal" || deal.itemId !== parsed.data.itemId || deal.agreedDailyCents === undefined)) {
      throw new DataError("That deal is not available for this item.", 409);
    }
    const saved = updateDataState((state) => {
      const item = state.items.find((entry) => entry.id === parsed.data.itemId);
      if (!item || !state.shops.some((shop) => shop.id === item.shopId && shop.liveAt)) throw new DataError("Published item not found", 404);
      if (item.kind === "food") throw new DataError("Use food ordering for this listing.");
      if (item.kind === "rental" && (!parsed.data.startsAt || !parsed.data.endsAt)) throw new DataError("Choose a rental start and end time.");
      if (item.sizes?.length && !parsed.data.size) throw new DataError("Choose a size for this item.");
      const issue = availabilityIssue(item, parsed.data);
      if (issue) throw new DataError(issue, 409);
      const inquiry: ItemRequest = {
        ...parsed.data,
        ...(deal ? { agreedPriceCents: deal.agreedDailyCents } : {}),
        id: `request-${crypto.randomUUID()}`,
        shopId: item.shopId,
        kind: item.kind,
        status: "requested",
        createdAt: new Date().toISOString(),
      };
      state.itemRequests ??= [];
      state.itemRequests.unshift(inquiry);
      return inquiry;
    });
    return Response.json(saved, { status: 201 });
  } catch (error) { return dataError(error); }
}
