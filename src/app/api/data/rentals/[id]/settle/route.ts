// SIMULATED PAYMENT. This settles the hold in the local ledger only; no money moves.
// To connect a real provider, replace `simulatedPayments` below with a PaymentProvider
// whose capture() captures captureCents on the held payment and releases the rest.
import { z } from "zod";
import { settleHold, simulatedPayments } from "@/server/data/rentals";
import { dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

const SettleSchema = z.object({
  extraChargeCents: z.number().int().min(0).max(100_000_000).default(0),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = SettleSchema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.path[0] === "note" ? "Keep the damage note under 500 characters" : "The extra charge must be a whole number of cents";
    return Response.json({ error }, { status: 400 });
  }
  const { extraChargeCents, note } = parsed.data;
  // The renter sees this note next to the damage charge on their receipt.
  if (extraChargeCents > 0 && !note) return Response.json({ error: "Add a note that explains the damage charge" }, { status: 400 });
  try {
    const rental = updateDataState((state) => settleHold(state, id, extraChargeCents, simulatedPayments, note));
    return Response.json(rental, { headers: { "x-payment-mode": simulatedPayments.mode } });
  } catch (error) { return dataError(error); }
}
