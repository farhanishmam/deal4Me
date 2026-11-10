import type {
  AgentCard, Cents, FoodOrder, Item, ItemRequest, ItemRequestInput, Negotiation, NegotiationRound,
  OrderLine, PriceSuggestion, Rental, SellerKind, Shop,
  StorefrontConfig, VisitorProfile,
} from "./types";

export interface Progress {
  onStep?: (label: string) => void;
  onItem?: (item: Item, index: number) => void;
}

export interface Api {
  importFromWebsite(input: { url?: string; text?: string }, cb?: Progress): Promise<Shop>;
  importFromPhotos(files: (File | string)[], sellerKind: SellerKind, cb?: Progress): Promise<Shop>;
  importFromDescription(text: string, cb?: Progress): Promise<Shop>;
  suggestPrice(item: Partial<Item>): Promise<PriceSuggestion>;
  applyStorefrontInstruction(shopId: string, instruction: string): Promise<{ config: StorefrontConfig; changes: string[] }>;
  updateItem(item: Item): Promise<Item>;
  requestItem(input: ItemRequestInput): Promise<ItemRequest>;
  askVisitorAgent(message: string, profile: VisitorProfile): Promise<{ reply: string; cards: AgentCard[]; steps: string[] }>;
  startNegotiation(input: { itemId: string; days: number; visitorMaxCents: Cents; mode: "agent" | "manual" }, cb?: { onRound?: (round: NegotiationRound) => void; signal?: AbortSignal }): Promise<Negotiation>;
  submitManualOffer(negotiationId: string, offerCents: Cents, message: string): Promise<Negotiation>;
  createRentalHold(input: { itemId: string; days: number; negotiationId?: string }): Promise<Rental>;
  markPickedUp(rentalId: string, photos: string[]): Promise<Rental>;
  submitReturn(rentalId: string, photos: string[]): Promise<Rental>;
  settleRental(rentalId: string, extraChargeCents?: Cents): Promise<Rental>;
  placeFoodOrder(shopId: string, lines: OrderLine[], pickupTime: string): Promise<FoodOrder>;
}
