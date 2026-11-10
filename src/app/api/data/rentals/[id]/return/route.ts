import { z } from "zod";
import { DamageCheckSchema, PhotosSchema } from "@/server/data/schema";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = z.object({ photos: PhotosSchema, damageCheck: DamageCheckSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Return photos and a damage check are required" }, { status: 400 });
  try {
    const rental = updateDataState((state) => {
      const current = state.rentals.find((r) => r.id === id);
      if (!current) throw new DataError("Rental not found", 404);
      if (current.status !== "picked_up") throw new DataError("This rental is not awaiting return", 409);
      const next = { ...current, status: "returned" as const, returnPhotos: parsed.data.photos, damageCheck: parsed.data.damageCheck };
      state.rentals = state.rentals.map((r) => r.id === id ? next : r);
      return next;
    });
    return Response.json(rental);
  } catch (error) { return dataError(error); }
}
