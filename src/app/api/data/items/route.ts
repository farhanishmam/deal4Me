import { keepPrivateTerms } from "@/server/data/private-terms";
import { ItemInputSchema } from "@/server/data/schema";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ItemInputSchema.safeParse(body?.item);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid item" }, { status: 400 });
  try {
    // A new item is appended on the server, so a device with a stale copy of the shop cannot drop other items.
    if (body?.create === true) {
      const created = updateDataState((state) => {
        const item = parsed.data;
        const shop = state.shops.find((s) => s.id === item.shopId);
        if (!shop) throw new DataError("Shop not found", 404);
        if (state.items.some((i) => i.id === item.id)) throw new DataError("This item already exists", 409);
        const next = keepPrivateTerms(item, undefined);
        state.items.push(next);
        const section = shop.storefront.sections.find((s) => s.title === next.category);
        if (section) section.itemIds.push(next.id);
        else shop.storefront.sections.push({ id: `${next.id}-section`, title: next.category, itemIds: [next.id] });
        return { item: next, shop };
      });
      return Response.json(created, { status: 201 });
    }
    const item = updateDataState((state) => {
      const existing = state.items.find((i) => i.id === parsed.data.id);
      if (!existing || existing.shopId !== parsed.data.shopId) throw new DataError("Item not found", 404);
      const next = keepPrivateTerms(parsed.data, existing);
      state.items = state.items.map((i) => i.id === existing.id ? next : i);
      return next;
    });
    return Response.json(item);
  } catch (error) { return dataError(error); }
}
