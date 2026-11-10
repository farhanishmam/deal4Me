import { z } from "zod";
import { PhotosSchema } from "@/server/data/schema";
import { DataError, dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = z.object({ photos: PhotosSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Upload pickup photos" }, { status: 400 });
  try {
    const rental = updateDataState((state) => {
      const current = state.rentals.find((r) => r.id === id);
      if (!current) throw new DataError("Rental not found", 404);
      if (current.status !== "reserved") throw new DataError("This rental is not awaiting pickup", 409);
      const next = { ...current, status: "picked_up" as const, pickupPhotos: parsed.data.photos };
      state.rentals = state.rentals.map((r) => r.id === id ? next : r);
      return next;
    });
    return Response.json(rental);
  } catch (error) { return dataError(error); }
}
