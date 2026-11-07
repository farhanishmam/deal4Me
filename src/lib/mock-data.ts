// Fake data for the prototype. Every person and business here is fictional.
// Seed dates come from the current day at fixed hours (Salt Lake City time),
// and ids and codes are fixed strings, so the server and the browser build the
// exact same data.

import { zonedIso } from "./format";
import type {
  Actor,
  Cents,
  Condition,
  FoodOrder,
  Item,
  ItemKind,
  Negotiation,
  PriceSuggestion,
  Rental,
  Shop,
  StepEvent,
  StorefrontTheme,
  VisitorProfile,
} from "./types";

export interface TimerState {
  startedAt: number;
  stoppedAt?: number;
}
export interface Timers {
  onboarding?: TimerState;
  deal?: TimerState;
}

export interface SeedState {
  shops: Shop[];
  items: Item[];
  negotiations: Negotiation[];
  rentals: Rental[];
  orders: FoodOrder[];
  stepLog: StepEvent[];
  visitor: VisitorProfile;
  timers: Timers;
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export const THEMES: Record<StorefrontTheme["preset"], StorefrontTheme> = {
  // Warm wood, cream paper, serif type.
  ski_lodge: {
    preset: "ski_lodge",
    primary: "#7a4a2b",
    background: "#f4ece0",
    surface: "#fbf6ee",
    text: "#2c1f16",
    accent: "#b5833a",
    font: "serif",
    radius: "md",
  },
  // Bold tomato red on sunny yellow, rounded and loud.
  food_truck: {
    preset: "food_truck",
    primary: "#e23a1d",
    background: "#fff4cf",
    surface: "#ffffff",
    text: "#1d1208",
    accent: "#ffb400",
    font: "rounded",
    radius: "lg",
  },
  // White, airy, one cool blue.
  alpine_minimal: {
    preset: "alpine_minimal",
    primary: "#1d3b53",
    background: "#ffffff",
    surface: "#f5f7f9",
    text: "#0f1a24",
    accent: "#6fa3c7",
    font: "sans",
    radius: "sm",
  },
  // Near black with neon pink and mint.
  night_market: {
    preset: "night_market",
    primary: "#ff3d9a",
    background: "#0c0a14",
    surface: "#171325",
    text: "#f4f0ff",
    accent: "#2ff0d2",
    font: "sans",
    radius: "md",
  },
};

export const THEME_LABELS: Record<StorefrontTheme["preset"], string> = {
  ski_lodge: "Ski Lodge",
  food_truck: "Food Truck",
  alpine_minimal: "Alpine Minimal",
  night_market: "Night Market",
};

// ---------------------------------------------------------------------------
// Demo reference prices (category x condition), used by the deals agent
// ---------------------------------------------------------------------------

export const REFERENCE_PRICES_LABEL = "demo reference prices";

export interface ReferencePrice {
  dailyCents: Cents;
  depositCents: Cents;
  saleCents: Cents;
}

const d = (dollars: number): Cents => dollars * 100;
const ref = (daily: number, deposit: number, sale: number): ReferencePrice => ({
  dailyCents: d(daily),
  depositCents: d(deposit),
  saleCents: d(sale),
});

export const REFERENCE_PRICES: Record<string, Record<Condition, ReferencePrice>> = {
  Skis: {
    new: ref(75, 350, 450),
    like_new: ref(60, 300, 320),
    good: ref(48, 250, 220),
    used: ref(35, 200, 140),
  },
  Snowboard: {
    new: ref(60, 300, 380),
    like_new: ref(52, 280, 300),
    good: ref(45, 250, 220),
    used: ref(32, 180, 140),
  },
  Boots: {
    new: ref(28, 150, 260),
    like_new: ref(24, 120, 180),
    good: ref(20, 100, 140),
    used: ref(14, 80, 80),
  },
  Outerwear: {
    new: ref(16, 100, 150),
    like_new: ref(12, 80, 110),
    good: ref(9, 60, 80),
    used: ref(6, 40, 45),
  },
  Snowshoes: {
    new: ref(14, 80, 120),
    like_new: ref(12, 70, 95),
    good: ref(10, 60, 70),
    used: ref(7, 40, 40),
  },
  Helmet: {
    new: ref(14, 80, 90),
    like_new: ref(12, 70, 65),
    good: ref(9, 50, 45),
    used: ref(6, 40, 25),
  },
  Goggles: {
    new: ref(10, 40, 35),
    like_new: ref(8, 35, 28),
    good: ref(6, 30, 20),
    used: ref(4, 20, 12),
  },
  Poles: {
    new: ref(8, 50, 60),
    like_new: ref(7, 45, 45),
    good: ref(5, 40, 30),
    used: ref(4, 30, 18),
  },
  Other: {
    new: ref(12, 60, 60),
    like_new: ref(10, 50, 45),
    good: ref(8, 40, 35),
    used: ref(5, 30, 20),
  },
};

/** Maps free text such as "Ski boots 26.5" to a reference category. */
export function referenceCategory(text: string | undefined): keyof typeof REFERENCE_PRICES {
  const t = (text ?? "").toLowerCase();
  if (/boot/.test(t)) return "Boots";
  if (/snowboard|board/.test(t)) return "Snowboard";
  if (/goggle/.test(t)) return "Goggles";
  if (/helmet/.test(t)) return "Helmet";
  if (/pole/.test(t)) return "Poles";
  if (/snowshoe/.test(t)) return "Snowshoes";
  if (/jacket|shell|outerwear|coat|parka|pants/.test(t)) return "Outerwear";
  if (/\bski/.test(t)) return "Skis";
  return "Other";
}

export function referencePrice(categoryOrName: string | undefined, condition: Condition = "good"): ReferencePrice {
  return REFERENCE_PRICES[referenceCategory(categoryOrName)][condition];
}

const FOOD_GUESSES: [RegExp, Cents][] = [
  [/taco/i, d(4)],
  [/burrito|bowl|sandwich|toast/i, d(10)],
  [/plate|nachos|platter/i, d(11)],
  [/latte|mocha|coffee|brew|espresso|tea/i, d(5)],
  [/horchata|jamaica|agua|juice|soda|lemonade|drink/i, d(4)],
  [/croissant|roll|muffin|cookie|pastry|scone/i, d(4)],
];

export function foodGuessCents(name: string): Cents {
  for (const [re, cents] of FOOD_GUESSES) if (re.test(name)) return cents;
  return d(9);
}

const roundDollar = (cents: Cents) => Math.round(cents / 100) * 100;

/** The deals agent's price idea for an item, from the demo reference table. */
export function referenceSuggestion(
  input: { name?: string; category?: string; condition?: Condition; kind?: ItemKind },
): PriceSuggestion {
  const condition = input.condition ?? "good";
  const label = (input.name || input.category || "this item").toLowerCase();

  if (input.kind === "food") {
    const amount = foodGuessCents(input.name ?? "");
    return {
      amountCents: amount,
      rangeCents: [roundDollar(amount * 0.85), roundDollar(amount * 1.2)],
      reasoning: `Similar items in Salt Lake sell for about ${Math.round(amount / 100)} dollars (${REFERENCE_PRICES_LABEL}).`,
    };
  }

  const r = referencePrice(input.category ?? input.name, condition);
  const conditionText = condition.replace("_", " ");
  if (input.kind === "sale") {
    return {
      amountCents: r.saleCents,
      rangeCents: [roundDollar(r.saleCents * 0.85), roundDollar(r.saleCents * 1.15)],
      reasoning: `Typical resale for ${conditionText} ${label}, from ${REFERENCE_PRICES_LABEL}.`,
    };
  }
  return {
    amountCents: r.dailyCents,
    rangeCents: [roundDollar(r.dailyCents * 0.85), roundDollar(r.dailyCents * 1.15)],
    depositCents: r.depositCents,
    reasoning: `${conditionText[0].toUpperCase()}${conditionText.slice(1)} ${label} usually rent for this much per day, from ${REFERENCE_PRICES_LABEL}.`,
  };
}

// ---------------------------------------------------------------------------
// Upload samples for the photo import fallback
// ---------------------------------------------------------------------------

export const UPLOAD_SAMPLES: string[] = Array.from(
  { length: 12 },
  (_, i) => `/demo/uploads/upload-${String(i + 1).padStart(2, "0")}.svg`,
);

export interface UploadIdentity {
  name: string;
  category: string;
  condition: Condition;
  description: string;
}

/** What the photo import "recognizes", by photo number (1 to 12). */
export const UPLOAD_CATALOG: UploadIdentity[] = [
  { name: "All-mountain skis, 165 cm", category: "Skis", condition: "good", description: "Versatile skis with bindings. Waxed this season." },
  { name: "Ski boots, size 27", category: "Boots", condition: "like_new", description: "Two-buckle boots with warm liners." },
  { name: "Shell jacket, L", category: "Outerwear", condition: "good", description: "Waterproof and windproof. Zip vents." },
  { name: "Ski helmet, M", category: "Helmet", condition: "like_new", description: "Light helmet with adjustable fit." },
  { name: "Snowboard, 158 cm", category: "Snowboard", condition: "good", description: "Directional board with strap-in bindings." },
  { name: "Ski goggles", category: "Goggles", condition: "new", description: "Anti-fog lens for bright days." },
  { name: "Snowshoes, trail", category: "Snowshoes", condition: "good", description: "Light frames with easy straps." },
  { name: "Ski poles, 120 cm", category: "Poles", condition: "good", description: "Aluminum poles with comfy grips." },
  { name: "Insulated jacket, M", category: "Outerwear", condition: "like_new", description: "Warm layer for cold chairlifts." },
  { name: "Ski boots, size 26", category: "Boots", condition: "good", description: "Comfortable mid-flex boots." },
  { name: "Snowboard, 150 cm", category: "Snowboard", condition: "used", description: "Beginner-friendly board with bindings." },
  { name: "Helmet, L", category: "Helmet", condition: "good", description: "Vented helmet, clean liner." },
];

// ---------------------------------------------------------------------------
// Shops and items
// ---------------------------------------------------------------------------

export const SHOP_IDS = ["canyon-taco", "second-chair", "mayas-gear", "theos-closet"] as const;

const photo = (id: string) => `/demo/items/${id}.svg`;
const hero = (shopId: string) => `/demo/heroes/${shopId}.svg`;

function food(
  id: string,
  shopId: string,
  category: string,
  name: string,
  description: string,
  priceDollars: number,
  tags: string[] = [],
): Item {
  return {
    id,
    shopId,
    kind: "food",
    name,
    description,
    category,
    photoUrl: photo(id),
    priceCents: d(priceDollars),
    tags,
    available: true,
  };
}

function rental(
  id: string,
  shopId: string,
  category: string,
  name: string,
  description: string,
  condition: Condition,
  terms: { fee: number; min: number; deposit: number; maxDays: number; binding?: boolean },
  tags: string[],
): Item {
  return {
    id,
    shopId,
    kind: "rental",
    name,
    description,
    category,
    photoUrl: photo(id),
    condition,
    rental: {
      dailyFeeCents: d(terms.fee),
      minDailyFeeCents: d(terms.min),
      depositCents: d(terms.deposit),
      maxDays: terms.maxDays,
      bindingCheckRequired: terms.binding ?? false,
    },
    suggestion: referenceSuggestion({ name, category, condition, kind: "rental" }),
    tags,
    available: true,
  };
}

function buildItems(): Item[] {
  return [
    // Canyon Taco Co.
    food("ct-carne-asada", "canyon-taco", "Tacos", "Carne asada taco", "Grilled steak, onion, cilantro, salsa verde.", 4, ["taco", "beef"]),
    food("ct-al-pastor", "canyon-taco", "Tacos", "Al pastor taco", "Pineapple-marinated pork shaved off the spit.", 4, ["taco", "pork"]),
    food("ct-baja-fish", "canyon-taco", "Tacos", "Baja fish taco", "Crisp cod, cabbage slaw, lime crema.", 5, ["taco", "fish"]),
    food("ct-burrito", "canyon-taco", "Plates", "Burrito", "Rice, black beans, cheese and your pick of meat.", 11, ["burrito"]),
    food("ct-taco-plate", "canyon-taco", "Plates", "Taco plate", "Three tacos with rice and beans.", 14, ["taco", "plate"]),
    food("ct-nachos", "canyon-taco", "Plates", "Loaded nachos", "Warm chips, queso, pico, jalapeños.", 9, ["share"]),
    food("ct-horchata", "canyon-taco", "Drinks", "Horchata", "Cold rice milk with cinnamon.", 4, ["drink"]),
    food("ct-jamaica", "canyon-taco", "Drinks", "Agua de jamaica", "Hibiscus tea, lightly sweet, over ice.", 3, ["drink"]),

    // Second Chair Coffee
    food("sc-breakfast-burrito", "second-chair", "Breakfast", "Breakfast burrito", "Eggs, potato, cheddar, green chile.", 9, ["breakfast"]),
    food("sc-avocado-toast", "second-chair", "Breakfast", "Avocado toast", "Seeded sourdough, avocado, chili flakes.", 10, ["breakfast"]),
    food("sc-granola", "second-chair", "Breakfast", "Granola bowl", "Yogurt, honey granola, seasonal fruit.", 7, ["breakfast"]),
    food("sc-latte", "second-chair", "Coffee", "Latte", "Double shot, steamed milk.", 5, ["coffee"]),
    food("sc-cold-brew", "second-chair", "Coffee", "Cold brew", "Steeped for 18 hours, served over ice.", 5, ["coffee"]),
    food("sc-mocha", "second-chair", "Coffee", "Mocha", "Espresso, dark chocolate, steamed milk.", 6, ["coffee"]),
    food("sc-croissant", "second-chair", "Pastries", "Butter croissant", "Baked each morning.", 4, ["pastry"]),
    food("sc-cinnamon-roll", "second-chair", "Pastries", "Cinnamon roll", "Warm, with cream cheese glaze.", 5, ["pastry"]),

    // Maya's Gear Garage
    rental("mg-skis", "mayas-gear", "Skis", "All-mountain skis, 170 cm", "Waxed, tuned, bindings set for you.", "like_new",
      { fee: 60, min: 38, deposit: 300, maxDays: 7, binding: true }, ["ski"]),
    rental("mg-boots", "mayas-gear", "Boots", "Ski boots, size 26.5", "Mid-flex boots with warm liners.", "good",
      { fee: 20, min: 12, deposit: 100, maxDays: 7 }, ["ski", "snowboard"]),
    rental("mg-jacket", "mayas-gear", "Outerwear", "Shell jacket, M", "Waterproof, windproof, underarm vents.", "like_new",
      { fee: 12, min: 8, deposit: 80, maxDays: 7 }, ["ski", "snowboard", "layer"]),
    rental("mg-snowshoes", "mayas-gear", "Snowshoes", "Snowshoes", "Light frames for trails above the city.", "good",
      { fee: 10, min: 6, deposit: 60, maxDays: 7 }, ["explore"]),

    // Theo's Ski Closet
    rental("tc-snowboard", "theos-closet", "Snowboard", "Snowboard, 155 cm", "All-mountain board, bindings included.", "good",
      { fee: 45, min: 30, deposit: 250, maxDays: 7, binding: true }, ["snowboard"]),
    {
      id: "tc-goggles",
      shopId: "theos-closet",
      kind: "sale",
      name: "Ski goggles",
      description: "Anti-fog lens for bright days.",
      category: "Goggles",
      photoUrl: photo("tc-goggles"),
      condition: "new",
      priceCents: d(35),
      suggestion: referenceSuggestion({ name: "Ski goggles", category: "Goggles", condition: "new", kind: "sale" }),
      tags: ["ski", "snowboard"],
      available: true,
    },
  ];
}

function buildShops(): Shop[] {
  return [
    {
      id: "canyon-taco",
      slug: "canyon-taco",
      sellerKind: "business",
      name: "Canyon Taco Co.",
      ownerFirstName: "Marco",
      neighborhood: "University District",
      rating: 4.8,
      distanceKm: 2.1,
      liveAt: zonedIso(-12, 9, 15),
      onboardingSeconds: 78,
      storefront: {
        shopId: "canyon-taco",
        slug: "canyon-taco",
        name: "Canyon Taco Co.",
        tagline: "Fast, fresh tacos near campus.",
        bannerText: "Order ahead and skip the line",
        heroPhotoUrl: hero("canyon-taco"),
        theme: THEMES.food_truck,
        sections: [
          { id: "tacos", title: "Tacos", itemIds: ["ct-carne-asada", "ct-al-pastor", "ct-baja-fish"] },
          { id: "plates", title: "Plates", itemIds: ["ct-burrito", "ct-taco-plate", "ct-nachos"] },
          { id: "drinks", title: "Drinks", itemIds: ["ct-horchata", "ct-jamaica"] },
        ],
        languages: ["en", "es"],
        badges: { agentReady: true, permitVerified: true },
      },
    },
    {
      id: "second-chair",
      slug: "second-chair",
      sellerKind: "business",
      name: "Second Chair Coffee",
      ownerFirstName: "Priya",
      neighborhood: "Downtown",
      rating: 4.7,
      distanceKm: 0.8,
      liveAt: zonedIso(-9, 8, 40),
      onboardingSeconds: 148,
      storefront: {
        shopId: "second-chair",
        slug: "second-chair",
        name: "Second Chair Coffee",
        tagline: "Coffee and breakfast for early lifts.",
        bannerText: "Open at 6 am",
        heroPhotoUrl: hero("second-chair"),
        theme: THEMES.alpine_minimal,
        sections: [
          { id: "breakfast", title: "Breakfast", itemIds: ["sc-breakfast-burrito", "sc-avocado-toast", "sc-granola"] },
          { id: "coffee", title: "Coffee", itemIds: ["sc-latte", "sc-cold-brew", "sc-mocha"] },
          { id: "pastries", title: "Pastries", itemIds: ["sc-croissant", "sc-cinnamon-roll"] },
        ],
        languages: ["en", "ja"],
        badges: { agentReady: true, permitVerified: true },
      },
    },
    {
      id: "mayas-gear",
      slug: "mayas-gear",
      sellerKind: "local",
      name: "Maya's Gear Garage",
      ownerFirstName: "Maya",
      neighborhood: "Sugar House",
      rating: 4.9,
      distanceKm: 4.3,
      liveAt: zonedIso(-6, 18, 5),
      onboardingSeconds: 92,
      storefront: {
        shopId: "mayas-gear",
        slug: "mayas-gear",
        name: "Maya's Gear Garage",
        tagline: "Skis, boots and layers from a local.",
        bannerText: "Fitted and ready the day you land",
        heroPhotoUrl: hero("mayas-gear"),
        theme: THEMES.ski_lodge,
        sections: [
          { id: "gear", title: "Rent from Maya", itemIds: ["mg-skis", "mg-boots", "mg-jacket", "mg-snowshoes"] },
        ],
        languages: ["en", "ja"],
        badges: { agentReady: true, bindingPartner: "Wasatch Ski Service" },
      },
    },
    {
      id: "theos-closet",
      slug: "theos-closet",
      sellerKind: "local",
      name: "Theo's Ski Closet",
      ownerFirstName: "Theo",
      neighborhood: "The Avenues",
      rating: 4.6,
      distanceKm: 1.9,
      liveAt: zonedIso(-3, 20, 30),
      onboardingSeconds: 66,
      storefront: {
        shopId: "theos-closet",
        slug: "theos-closet",
        name: "Theo's Ski Closet",
        tagline: "Boards and goggles from the Avenues.",
        bannerText: "Late pickups welcome",
        heroPhotoUrl: hero("theos-closet"),
        theme: THEMES.night_market,
        sections: [
          { id: "gear", title: "Boards and goggles", itemIds: ["tc-snowboard", "tc-goggles"] },
        ],
        languages: ["en"],
        badges: { agentReady: true, bindingPartner: "Wasatch Ski Service" },
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Visitor
// ---------------------------------------------------------------------------

function buildVisitor(): VisitorProfile {
  return {
    firstName: "Haruto",
    // The visitor picks Japanese on the welcome screen during the demo.
    language: "en",
    tripStart: zonedIso(1, 12),
    tripEnd: zonedIso(5, 12),
    interests: ["ski", "food"],
    budgetCents: d(250),
  };
}

// ---------------------------------------------------------------------------
// Orders, rentals, negotiation, step log
// ---------------------------------------------------------------------------

function buildOrders(items: Item[]): FoodOrder[] {
  const price = (id: string) => items.find((i) => i.id === id)?.priceCents ?? 0;
  const total = (lines: { itemId: string; qty: number }[]) =>
    lines.reduce((sum, l) => sum + price(l.itemId) * l.qty, 0);

  const l1 = [{ itemId: "ct-al-pastor", qty: 2 }, { itemId: "ct-horchata", qty: 1 }];
  const l2 = [{ itemId: "sc-breakfast-burrito", qty: 1 }, { itemId: "sc-latte", qty: 2 }];
  const l3 = [{ itemId: "ct-taco-plate", qty: 1 }, { itemId: "ct-jamaica", qty: 1 }];
  const l4 = [{ itemId: "sc-avocado-toast", qty: 1 }, { itemId: "sc-cold-brew", qty: 1 }, { itemId: "sc-croissant", qty: 1 }];

  return [
    { id: "order-seed-1", shopId: "canyon-taco", lines: l1, totalCents: total(l1), pickupTime: zonedIso(0, 17, 30), pickupCode: "CT-482", status: "placed" },
    { id: "order-seed-2", shopId: "second-chair", lines: l2, totalCents: total(l2), pickupTime: zonedIso(0, 18, 0), pickupCode: "SC-117", status: "accepted" },
    { id: "order-seed-3", shopId: "canyon-taco", lines: l3, totalCents: total(l3), pickupTime: zonedIso(0, 16, 45), pickupCode: "CT-905", status: "ready" },
    { id: "order-seed-4", shopId: "second-chair", lines: l4, totalCents: total(l4), pickupTime: zonedIso(0, 11, 30), pickupCode: "SC-264", status: "picked_up" },
  ];
}

function buildRentals(): Rental[] {
  const days = 2;
  const daily = d(10);
  const deposit = d(80);
  return [
    {
      id: "rental-seed-1",
      itemId: "mg-jacket",
      shopId: "mayas-gear",
      days,
      dailyFeeCents: daily,
      depositCents: deposit,
      holdCents: days * daily + deposit,
      status: "picked_up",
      pickupCode: "482915",
      pickupAt: zonedIso(0, 10, 0),
      returnBy: zonedIso(2, 17, 0),
      pickupPhotos: ["/demo/uploads/upload-03.svg"],
      returnPhotos: [],
    },
    {
      id: "rental-seed-2",
      itemId: "mg-boots",
      shopId: "mayas-gear",
      negotiationId: "neg-seed-1",
      days: 3,
      dailyFeeCents: d(14),
      depositCents: d(100),
      holdCents: 3 * d(14) + d(100),
      status: "picked_up",
      pickupCode: "730164",
      pickupAt: zonedIso(-2, 16, 0),
      returnBy: zonedIso(1, 17, 0),
      pickupPhotos: ["/demo/uploads/upload-02.svg"],
      returnPhotos: [],
    },
    {
      id: "rental-seed-3",
      itemId: "tc-snowboard",
      shopId: "theos-closet",
      days: 4,
      dailyFeeCents: d(38),
      depositCents: d(250),
      holdCents: 4 * d(38) + d(250),
      status: "reserved",
      pickupCode: "251708",
      pickupAt: zonedIso(-1, 9, 0),
      returnBy: zonedIso(3, 17, 0),
      pickupPhotos: [],
      returnPhotos: [],
    },
  ];
}

function buildNegotiations(): Negotiation[] {
  // Same engine the mock API runs: asking $20, minimum $12, visitor max $16,
  // three days. The deal lands at $14 a day in round 4.
  const at = (minutes: number) => zonedIso(-1, 15, 30 + minutes);
  const rounds: Negotiation["rounds"] = [
    { n: 1, by: "owner", offerCents: d(20), message: "Happy to rent these. $20 a day.", at: at(0) },
    { n: 1, by: "visitor", offerCents: d(10), message: "Could you do $10 a day?", at: at(1) },
    { n: 2, by: "owner", offerCents: d(17), message: "I can do $17 a day.", at: at(1) },
    { n: 2, by: "visitor", offerCents: d(12), message: "How about $12 a day?", at: at(2) },
    { n: 3, by: "owner", offerCents: d(15), message: "Meeting you partway: $15 a day.", at: at(2) },
    { n: 3, by: "visitor", offerCents: d(13), message: "I can stretch to $13 a day.", at: at(3) },
    { n: 4, by: "owner", offerCents: d(14), message: "I can do $14 a day.", at: at(3) },
    { n: 4, by: "visitor", offerCents: d(14), message: "Deal. $14 a day.", at: at(4) },
  ];
  return [
    {
      id: "neg-seed-1",
      itemId: "mg-boots",
      days: 3,
      askingCents: d(20),
      visitorMaxCents: d(16),
      rounds,
      maxRounds: 6,
      mode: "agent",
      status: "deal",
      agreedDailyCents: d(14),
    },
  ];
}

function buildStepLog(): StepEvent[] {
  const e = (
    id: string,
    day: number,
    hour: number,
    minute: number,
    actor: Actor,
    action: string,
    detail?: string,
    latencyMs?: number,
    costUsd?: number,
  ): StepEvent => ({ id, at: zonedIso(day, hour, minute), actor, action, detail, latencyMs, costUsd });

  // Newest first.
  return [
    e("seed-step-9", 0, 10, 12, "Payments", "Card hold placed", "$100 held, not charged", 640),
    e("seed-step-8", 0, 10, 11, "Owner agent", "Accepted $10/day", "Shell jacket, 2 days", 380, 0.0006),
    e("seed-step-7", 0, 9, 48, "Storefront agent", "Order received", "Canyon Taco Co., order-seed-1", 210),
    e("seed-step-6", -1, 15, 34, "Deals agent", "Deal reached", "$14/day on ski boots after 4 rounds", 5400, 0.0031),
    e("seed-step-5", -1, 15, 33, "Visitor agent", "Offered $13/day", "Ski boots, 3 days", 820, 0.0009),
    e("seed-step-4", -1, 15, 32, "Owner agent", "Countered $15/day", "Ski boots, 3 days", 790, 0.0009),
    e("seed-step-3", -1, 11, 2, "Deals agent", "Suggested a price", "Ski boots, good: $20/day, $100 deposit", 1350, 0.0042),
    e("seed-step-2", -3, 20, 31, "Onboarding agent", "Storefront live in 1:06", "Theo's Ski Closet, from 2 photos", 2480, 0.0118),
    e("seed-step-1", -12, 9, 16, "Onboarding agent", "Storefront live in 1:32", "Canyon Taco Co., from a website", 3120, 0.0147),
  ];
}

/** A fresh copy of the demo data. Call it again to reset. */
export function buildSeed(): SeedState {
  const items = buildItems();
  return {
    shops: buildShops(),
    items,
    negotiations: buildNegotiations(),
    rentals: buildRentals(),
    orders: buildOrders(items),
    stepLog: buildStepLog(),
    visitor: buildVisitor(),
    timers: {},
  };
}
