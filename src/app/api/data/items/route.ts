import { keepPrivateTerms } from "@/server/data/private-terms";
import { ItemInputSchema } from "@/server/data/schema";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ItemInputSchema.safeParse(body?.item);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid item" }, { status: 400 });
  try {
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
