import { z } from "zod";
import type { FoodOrder } from "@/lib/types";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";
const NEXT: Partial<Record<FoodOrder["status"], FoodOrder["status"]>> = { placed: "accepted", accepted: "ready", ready: "picked_up" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = z.object({ status: z.enum(["accepted", "ready", "picked_up"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid order status" }, { status: 400 });
  try {
    const order = updateDataState((state) => {
      const current = state.orders.find((o) => o.id === id);
      if (!current) throw new DataError("Order not found", 404);
      if (current.status !== parsed.data.status && NEXT[current.status] !== parsed.data.status) throw new DataError("Order status changed. Refresh and try again.", 409);
      const next = { ...current, status: parsed.data.status };
      state.orders = state.orders.map((o) => o.id === id ? next : o);
      return next;
    });
    return Response.json(order);
  } catch (error) { return dataError(error); }
}
