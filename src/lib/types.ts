export type Cents = number;
export type SellerKind = "business" | "local";
export type ItemKind = "food" | "rental" | "sale";
export type Condition = "new" | "like_new" | "good" | "used";
export type Lang = "en" | "ja" | "es" | "fr" | "de" | "ko" | "zh";
// amount = sale price, or daily fee for rentals
export interface PriceSuggestion { amountCents: Cents; rangeCents: [Cents, Cents]; depositCents?: Cents; reasoning: string; estimates?: PriceEstimates }
// Both ways to list one item: rent it per day, or sell it once.
export interface PriceEstimates { rental: PriceSuggestion; sale: PriceSuggestion }
// minDailyFeeCents is private: never shown to visitors
export interface RentalTerms { dailyFeeCents: Cents; minDailyFeeCents: Cents; depositCents: Cents; maxDays: number; bindingCheckRequired: boolean }
export interface Item { id: string; shopId: string; kind: ItemKind; name: string; description: string; category: string; photoUrl: string; photoUrls?: string[]; condition?: Condition; priceCents?: Cents; rental?: RentalTerms; suggestion?: PriceSuggestion; tags?: string[]; available: boolean; availableFrom?: string; availableUntil?: string; sizes?: string[] }
/** An inquiry for the owner to review; it neither reserves stock nor takes payment. */
export interface ItemRequest { id: string; itemId: string; shopId: string; kind: "rental" | "sale"; startsAt?: string; endsAt?: string; size?: string; negotiationId?: string; agreedPriceCents?: Cents; status: "requested" | "confirmed"; createdAt: string }
export interface ItemRequestInput { itemId: string; startsAt?: string; endsAt?: string; size?: string; negotiationId?: string }
export interface StorefrontTheme { preset: "ski_lodge" | "food_truck" | "alpine_minimal" | "night_market"; primary: string; background: string; surface: string; text: string; accent: string; font: "sans" | "serif" | "rounded"; radius: "sm" | "md" | "lg" }
export interface StorefrontSection { id: string; title: string; itemIds: string[] }
export interface StorefrontConfig { shopId: string; slug: string; name: string; tagline: string; bannerText?: string; heroPhotoUrl?: string; theme: StorefrontTheme; sections: StorefrontSection[]; languages: Lang[]; badges: { agentReady: boolean; permitVerified?: boolean; bindingPartner?: string }; promo?: { text: string; percentOff: number; tag?: string } }
export interface Shop { id: string; slug: string; sellerKind: SellerKind; name: string; ownerFirstName: string; neighborhood: string; rating: number; distanceKm: number; storefront: StorefrontConfig; liveAt?: string; onboardingSeconds?: number }
export interface NegotiationRound { n: number; by: "visitor" | "owner"; offerCents: Cents; message: string; at: string }
export interface Negotiation { id: string; itemId: string; days: number; askingCents: Cents; visitorMaxCents: Cents; rounds: NegotiationRound[]; maxRounds: number; mode: "agent" | "manual"; status: "running" | "deal" | "no_deal"; agreedDailyCents?: Cents; kind?: "rental" | "sale" }
export type RentalStatus = "reserved" | "picked_up" | "returned" | "settled";
export interface Rental { id: string; itemId: string; shopId: string; negotiationId?: string; days: number; dailyFeeCents: Cents; depositCents: Cents; holdCents: Cents; capturedCents?: Cents; releasedCents?: Cents; status: RentalStatus; pickupCode: string; pickupAt: string; returnBy: string; pickupPhotos: string[]; returnPhotos: string[]; damageCheck?: { result: "clear" | "review"; note: string } }
export interface OrderLine { itemId: string; qty: number }
export interface FoodOrder { id: string; shopId: string; lines: OrderLine[]; totalCents: Cents; pickupTime: string; pickupCode: string; status: "placed" | "accepted" | "ready" | "picked_up" }
export interface AgentCard { kind: "rental" | "food" | "shop"; itemId?: string; shopId?: string; title: string; subtitle: string; priceLabel: string; actions: { label: string; href: string }[] }
export type Actor = "Onboarding agent" | "Deals agent" | "Storefront agent" | "Visitor agent" | "Owner agent" | "Payments" | "System";
// latency and cost are filled by real calls in Phase 2
export interface StepEvent { id: string; at: string; actor: Actor; action: string; detail?: string; latencyMs?: number; costUsd?: number }
export interface VisitorProfile { firstName: string; language: Lang; tripStart: string; tripEnd: string; interests: ("ski" | "food" | "explore")[]; budgetCents: Cents; preferredSize?: string }
