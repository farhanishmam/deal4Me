import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import type { FoodOrder } from "@/lib/types";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";
const BodySchema = z.object({
  shopId: z.string().min(1), pickupTime: z.string().datetime(),
  lines: z.array(z.object({ itemId: z.string().min(1), qty: z.number().int().min(1).max(100) })).min(1).max(100),
  note: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose items, quantities and a pickup time" }, { status: 400 });
  try {
    const order = updateDataState((state) => {
      const { shopId, lines, pickupTime, note } = parsed.data;
      const shop = state.shops.find((s) => s.id === shopId && s.liveAt);
      if (!shop) throw new DataError("Shop is not live", 404);
      if (Date.parse(pickupTime) < Date.now() - 60000) throw new DataError("Choose a future pickup time");
      if (new Set(lines.map((l) => l.itemId)).size !== lines.length) throw new DataError("Combine duplicate items before ordering");
      const totalCents = lines.reduce((sum, line) => {
        const item = state.items.find((i) => i.id === line.itemId && i.shopId === shopId && i.available && i.kind === "food");
        if (!item || item.priceCents === undefined) throw new DataError("An item is no longer available", 409);
        return sum + item.priceCents * line.qty;
      }, 0);
      const order: FoodOrder = {
        id: `order-${randomUUID()}`, shopId, lines, totalCents, pickupTime,
        pickupCode: String(randomInt(100000, 1000000)), status: "placed", ...(note ? { note } : {}),
      };
      state.orders.unshift(order);
      return order;
    });
    return Response.json(order, { status: 201 });
  } catch (error) { return dataError(error); }
}
