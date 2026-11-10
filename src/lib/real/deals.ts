import type { Api } from "@/lib/api-contract";
import { money } from "@/lib/format";
import { logStep, postJson } from "@/lib/real/http";
import { realNegotiate } from "@/lib/real/negotiate";
import { useStore } from "@/lib/store";
import type { FoodOrder, Rental } from "@/lib/types";

async function placeFoodOrder(...[shopId, lines, pickupTime]: Parameters<Api["placeFoodOrder"]>): Promise<FoodOrder> {
  const order = await postJson<FoodOrder>("/api/data/orders", { shopId, lines, pickupTime });
  useStore.getState().upsertOrder(order);
  logStep("Storefront agent", "Order placed", `${order.lines.length} items`);
  return order;
}

async function createRentalHold(input: Parameters<Api["createRentalHold"]>[0]): Promise<Rental> {
  const rental = await postJson<Rental>("/api/data/rentals/hold", input);
  useStore.getState().upsertRental(rental);
  logStep("Payments", "Simulated hold placed", `${money(rental.holdCents)} held in a test ledger, no real charge`);
  return rental;
}

async function markPickedUp(rentalId: string, photos: string[]): Promise<Rental> {
  const rental = await postJson<Rental>(`/api/data/rentals/${encodeURIComponent(rentalId)}/pickup`, { photos });
  useStore.getState().upsertRental(rental);
  logStep("Owner agent", "Pickup confirmed", `${photos.length} condition photos saved`);
  return rental;
}

async function settleRental(rentalId: string, extraChargeCents = 0): Promise<Rental> {
  const rental = await postJson<Rental>(`/api/data/rentals/${encodeURIComponent(rentalId)}/settle`, { extraChargeCents });
  useStore.getState().upsertRental(rental);
  logStep("Payments", "Simulated hold settled", `${money(rental.capturedCents ?? 0)} charged, ${money(rental.releasedCents ?? 0)} released, no real charge`);
  return rental;
}

export const realDeals = {
  ...realNegotiate,
  placeFoodOrder,
  createRentalHold,
  markPickedUp,
  settleRental,
} satisfies Pick<Api, "startNegotiation" | "submitManualOffer" | "placeFoodOrder" | "createRentalHold" | "markPickedUp" | "settleRental">;
