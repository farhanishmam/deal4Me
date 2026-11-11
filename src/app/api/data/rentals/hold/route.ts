// SIMULATED PAYMENT. This places a hold in the local ledger only; no card is charged.
// To connect a real provider, replace `simulatedPayments` below with a PaymentProvider
// whose authorize() calls the provider (for example creating an uncaptured payment
// intent for holdCents) and throws a DataError if the card is declined.
import { z } from "zod";
import { createHold, simulatedPayments } from "@/server/data/rentals";
import { dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

const HoldSchema = z.object({
  itemId: z.string().trim().min(1).max(180),
  days: z.number().int().min(1).max(365),
  negotiationId: z.string().trim().min(1).max(180).optional(),
  pickupAt: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  const parsed = HoldSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose an item and a number of days" }, { status: 400 });
  try {
    const rental = updateDataState((state) => createHold(state, parsed.data, simulatedPayments));
    return Response.json(rental, { headers: { "x-payment-mode": simulatedPayments.mode } });
  } catch (error) { return dataError(error); }
}
