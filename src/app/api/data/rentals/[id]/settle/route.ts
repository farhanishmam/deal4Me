// SIMULATED PAYMENT. This settles the hold in the local ledger only; no money moves.
// To connect a real provider, replace `simulatedPayments` below with a PaymentProvider
// whose capture() captures captureCents on the held payment and releases the rest.
import { z } from "zod";
import { settleHold, simulatedPayments } from "@/server/data/rentals";
import { dataError, updateDataState } from "@/server/data/store";

export const runtime = "nodejs";

const SettleSchema = z.object({ extraChargeCents: z.number().int().min(0).max(100_000_000).default(0) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = SettleSchema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) return Response.json({ error: "The extra charge must be a whole number of cents" }, { status: 400 });
  try {
    const rental = updateDataState((state) => settleHold(state, id, parsed.data.extraChargeCents, simulatedPayments));
    return Response.json(rental, { headers: { "x-payment-mode": simulatedPayments.mode } });
  } catch (error) { return dataError(error); }
}
