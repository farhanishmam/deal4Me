import { z } from "zod";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = z.object({ onboardingSeconds: z.number().nonnegative().max(86400).optional() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid onboarding duration" }, { status: 400 });
  try {
    const shop = updateDataState((state) => {
      const current = state.shops.find((s) => s.id === id);
      if (!current) throw new DataError("Shop not found", 404);
      if (!state.items.some((i) => i.shopId === id && i.available)) throw new DataError("Add an available item before publishing");
      const next = { ...current, liveAt: current.liveAt ?? new Date().toISOString(), onboardingSeconds: current.onboardingSeconds ?? parsed.data.onboardingSeconds };
      state.shops = state.shops.map((s) => s.id === id ? next : s);
      return next;
    });
    return Response.json(shop);
  } catch (error) { return dataError(error); }
}
