import { publicDataState } from "@/server/data/private-terms";
import { dataError, readDataState } from "@/server/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Buyer screens get the public catalog: no rental's private minimum. Seller screens ask for
 * `?view=seller` to edit it. There are no accounts, so any client can still ask for the seller
 * view; this keeps the minimum out of buyer browsers, it is not an access control.
 */
export async function GET(request: Request) {
  try {
    const state = readDataState();
    const seller = new URL(request.url).searchParams.get("view") === "seller";
    return Response.json(seller ? state : publicDataState(state), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return dataError(error); }
}
