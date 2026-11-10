import { z } from "zod";
import { keepPrivateTerms } from "@/server/data/private-terms";
import { ItemInputSchema, ShopSchema } from "@/server/data/schema";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";
const BodySchema = z.object({ shop: ShopSchema, items: z.array(ItemInputSchema).max(100).optional() });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid shop" }, { status: 400 });
  try {
    const { shop, items } = parsed.data;
    const saved = updateDataState((state) => {
      if (state.shops.some((s) => s.id !== shop.id && s.slug === shop.slug)) throw new DataError("This shop address is already taken", 409);
      if (items?.some((i) => i.shopId !== shop.id || state.items.some((old) => old.id === i.id && old.shopId !== shop.id))) throw new DataError("Item does not belong to this shop");
      if (items && new Set(items.map((i) => i.id)).size !== items.length) throw new DataError("Item identifiers must be unique");
      const known = new Set((items ?? state.items.filter((i) => i.shopId === shop.id)).map((i) => i.id));
      if (shop.storefront.sections.some((s) => s.itemIds.some((id) => !known.has(id)))) throw new DataError("A storefront section references an unknown item");
      const existing = state.shops.find((s) => s.id === shop.id);
      // Publication is a separate server action, never a client supplied timestamp.
      const next = { ...shop, liveAt: existing?.liveAt, onboardingSeconds: existing?.onboardingSeconds };
      state.shops = [...state.shops.filter((s) => s.id !== shop.id), next];
      if (items) {
        const stored = new Map(state.items.map((i) => [i.id, i]));
        state.items = [...state.items.filter((i) => i.shopId !== shop.id), ...items.map((i) => keepPrivateTerms(i, stored.get(i.id)))];
      }
      return next;
    });
    return Response.json(saved);
  } catch (error) { return dataError(error); }
}
