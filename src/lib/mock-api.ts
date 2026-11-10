// Mock API. Every function is async, waits a realistic delay, updates the
// store and logs a step. Phase 2 swaps single functions for real ones in
// src/lib/api.ts, so keep these signatures stable.

import { conditionLabel, daysBetween, money, perDay } from "./format";
import {
  THEMES,
  THEME_LABELS,
  UPLOAD_CATALOG,
  buildSeed,
  foodGuessCents,
  referenceSuggestion,
} from "./mock-data";
import { useStore } from "./store";
import type {
  Actor,
  AgentCard,
  Cents,
  FoodOrder,
  Item,
  Lang,
  Negotiation,
  NegotiationRound,
  OrderLine,
  PriceSuggestion,
  Rental,
  SellerKind,
  Shop,
  StorefrontConfig,
  StorefrontSection,
  StorefrontTheme,
  VisitorProfile,
} from "./types";

export type Progress = {
  onStep?: (label: string) => void;
  onItem?: (item: Item, index: number) => void;
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const between = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

/** Waits a random time in [min, max] ms and returns how long it waited. */
async function wait(min: number, max: number): Promise<number> {
  const ms = between(min, max);
  await sleep(ms);
  return ms;
}

const state = () => useStore.getState();

/** Rough, fake cost of an AI step, from its duration. */
const aiCost = (ms: number) => Math.round(ms * 0.0000032 * 10000) / 10000;

function log(actor: Actor, action: string, detail?: string, latencyMs?: number, costUsd?: number) {
  state().logStep({ actor, action, detail, latencyMs, costUsd });
}

const visitorLang = (): "en" | "ja" => (state().visitor.language === "ja" ? "ja" : "en");

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);

const titleCase = (text: string) =>
  text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

function uniqueShopId(base: string): string {
  const taken = new Set(state().shops.map((s) => s.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} not found`);
  return value;
}

// ---------------------------------------------------------------------------
// Onboarding imports
// ---------------------------------------------------------------------------

type DraftItem = Omit<Item, "id" | "shopId">;

interface Template {
  key: "tacos" | "cafe" | "kitchen" | "gear";
  sellerKind: SellerKind;
  preset: StorefrontTheme["preset"];
  defaultName: string;
  owner: string;
  neighborhood: string;
  tagline: string;
  /** Items are copies of the demo items, so their art matches their names. */
  sources: string[];
}

const TEMPLATES: Record<Template["key"], Template> = {
  tacos: {
    key: "tacos",
    sellerKind: "business",
    preset: "food_truck",
    defaultName: "Campus Taco Truck",
    owner: "Luis",
    neighborhood: "University District",
    tagline: "Fresh tacos, made to order.",
    sources: ["ct-carne-asada", "ct-al-pastor", "ct-baja-fish", "ct-taco-plate", "ct-nachos", "ct-horchata"],
  },
  cafe: {
    key: "cafe",
    sellerKind: "business",
    preset: "alpine_minimal",
    defaultName: "Corner Coffee",
    owner: "Nora",
    neighborhood: "Downtown",
    tagline: "Coffee and breakfast, early.",
    sources: ["sc-latte", "sc-cold-brew", "sc-breakfast-burrito", "sc-avocado-toast", "sc-croissant", "sc-cinnamon-roll"],
  },
  kitchen: {
    key: "kitchen",
    sellerKind: "business",
    preset: "food_truck",
    defaultName: "Neighborhood Kitchen",
    owner: "Alex",
    neighborhood: "Downtown",
    tagline: "Good food, close by.",
    sources: ["sc-breakfast-burrito", "ct-burrito", "ct-nachos", "sc-latte", "ct-horchata", "sc-croissant"],
  },
  gear: {
    key: "gear",
    sellerKind: "local",
    preset: "ski_lodge",
    defaultName: "Local Gear Locker",
    owner: "Sam",
    neighborhood: "Sugar House",
    tagline: "Ski gear from a local.",
    sources: ["mg-skis", "mg-boots", "mg-jacket", "mg-snowshoes"],
  },
};

function pickTemplate(text: string): Template {
  const t = text.toLowerCase();
  if (/ski|snowboard|gear|rent|boots|jacket|スキー|レンタル|ボード/.test(t)) return TEMPLATES.gear;
  if (/taco|mexican|burrito|truck|タコス/.test(t)) return TEMPLATES.tacos;
  if (/coffee|cafe|café|espresso|latte|bakery|pastry|コーヒー|カフェ/.test(t)) return TEMPLATES.cafe;
  return TEMPLATES.kitchen;
}

const ART_RULES: [RegExp, string][] = [
  [/asada|steak|beef/, "ct-carne-asada"],
  [/pastor|pork/, "ct-al-pastor"],
  [/fish|cod|baja/, "ct-baja-fish"],
  [/nacho|chips/, "ct-nachos"],
  [/horchata/, "ct-horchata"],
  [/jamaica|agua|hibiscus|lemonade|juice|soda/, "ct-jamaica"],
  [/burrito/, "ct-burrito"],
  [/plate|platter|bowl of rice/, "ct-taco-plate"],
  [/taco/, "ct-al-pastor"],
  [/cold brew|iced/, "sc-cold-brew"],
  [/mocha/, "sc-mocha"],
  [/latte|coffee|espresso|tea/, "sc-latte"],
  [/croissant/, "sc-croissant"],
  [/roll|muffin|pastry|cookie|scone/, "sc-cinnamon-roll"],
  [/toast|sandwich/, "sc-avocado-toast"],
  [/granola|yogurt|parfait/, "sc-granola"],
];

function artFor(name: string): string {
  const n = name.toLowerCase();
  const hit = ART_RULES.find(([re]) => re.test(n));
  return `/demo/items/${hit ? hit[1] : "ct-taco-plate"}.svg`;
}

function categoryFor(name: string): string {
  const n = name.toLowerCase();
  if (/taco/.test(n)) return "Tacos";
  if (/horchata|jamaica|agua|juice|soda|lemonade|latte|coffee|mocha|brew|espresso|tea|drink/.test(n)) return "Drinks";
  if (/croissant|roll|muffin|pastry|cookie|scone|cake/.test(n)) return "Pastries";
  return "Plates";
}

function foodDraft(name: string, priceCents: Cents): DraftItem {
  return {
    kind: "food",
    name,
    description: "Made fresh to order.",
    category: categoryFor(name),
    photoUrl: artFor(name),
    priceCents,
    available: true,
  };
}

const cleanName = (raw: string) => {
  const text = raw.replace(/^(the|a|an|our|my)\s+/i, "").replace(/\s+/g, " ").trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Pulls "Name - $4" lines out of a pasted menu. */
function parseMenuLines(text: string): DraftItem[] {
  const out: DraftItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*•]?\s*(.+?)[\s.:\-–—]+\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
    if (m && /[a-z]/i.test(m[1])) out.push(foodDraft(cleanName(m[1]), Math.round(Number(m[2]) * 100)));
  }
  return out;
}

/** Pulls "carne asada tacos are $4" style mentions out of a sentence. */
function parseSpokenPrices(text: string): DraftItem[] {
  const out: DraftItem[] = [];
  const re = /([A-Za-z][A-Za-z' &-]{2,40}?)\s+(?:is|are|for|at|costs?|goes for)\s+\$\s?(\d+(?:\.\d{1,2})?)/gi;
  for (const m of text.matchAll(re)) {
    const name = cleanName(m[1]);
    if (name.length > 2) out.push(foodDraft(name, Math.round(Number(m[2]) * 100)));
  }
  return out;
}

function draftsFromTemplate(tpl: Template): DraftItem[] {
  const base = buildSeed().items;
  return tpl.sources.map((id) => {
    const src = need(base.find((i) => i.id === id), id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, shopId: _shopId, ...rest } = src;
    return rest;
  });
}

function nameFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
    const first = host.split(".")[0];
    if (!first || first.length < 3) return undefined;
    return titleCase(first.replace(/[-_]+/g, " "));
  } catch {
    return undefined;
  }
}

function buildShop(opts: {
  name: string;
  tpl: Template;
  sellerKind?: SellerKind;
  drafts: DraftItem[];
}): { shop: Shop; items: Item[] } {
  const { name, tpl, drafts } = opts;
  const id = uniqueShopId(slug(name));
  const items: Item[] = [];
  const used = new Set<string>();
  for (const draft of drafts) {
    let itemId = `${id}-${slug(draft.name)}`;
    let n = 2;
    while (used.has(itemId)) itemId = `${id}-${slug(draft.name)}-${n++}`;
    used.add(itemId);
    items.push({ ...draft, id: itemId, shopId: id });
  }

  const sections: StorefrontSection[] = [];
  for (const item of items) {
    const sectionId = slug(item.category);
    const found = sections.find((s) => s.id === sectionId);
    if (found) found.itemIds.push(item.id);
    else sections.push({ id: sectionId, title: item.category, itemIds: [item.id] });
  }

  const shop: Shop = {
    id,
    slug: id,
    sellerKind: opts.sellerKind ?? tpl.sellerKind,
    name,
    ownerFirstName: tpl.owner,
    neighborhood: tpl.neighborhood,
    rating: 4.8,
    distanceKm: 1.6,
    storefront: {
      shopId: id,
      slug: id,
      name,
      tagline: tpl.tagline,
      theme: THEMES[tpl.preset],
      sections,
      languages: ["en"],
      badges: { agentReady: true },
    },
  };
  return { shop, items };
}

function commitShop(shop: Shop, items: Item[]) {
  const s = state();
  s.upsertShop(shop);
  items.forEach((i) => s.upsertItem(i));
}

async function emitItems(items: Item[], cb: Progress | undefined, min: number, max: number) {
  for (let i = 0; i < items.length; i++) {
    await sleep(between(min, max));
    cb?.onItem?.(items[i], i);
  }
}

async function importFromWebsite(
  input: { url?: string; text?: string },
  cb?: Progress,
): Promise<Shop> {
  const started = Date.now();
  const source = `${input.url ?? ""} ${input.text ?? ""}`;
  const tpl = pickTemplate(source);

  cb?.onStep?.("Reading your site");
  await wait(900, 1300);

  cb?.onStep?.("Finding menu items");
  const parsed = input.text ? parseMenuLines(input.text) : [];
  const drafts = parsed.length >= 2 && tpl.key !== "gear" ? parsed : draftsFromTemplate(tpl);
  const name = nameFromUrl(input.url) ?? tpl.defaultName;
  const { shop, items } = buildShop({ name, tpl, drafts });
  await emitItems(items, cb, 250, 450);

  cb?.onStep?.("Pricing with the deals agent");
  await wait(700, 1000);

  cb?.onStep?.("Building your storefront");
  await wait(600, 900);

  commitShop(shop, items);
  const ms = Date.now() - started;
  log("Onboarding agent", "Imported a website", `${shop.name}, ${items.length} items`, ms, aiCost(ms));
  return shop;
}

const FOOD_UPLOADS: { name: string; priceDollars: number }[] = [
  { name: "Carne asada taco", priceDollars: 4 },
  { name: "Al pastor taco", priceDollars: 4 },
  { name: "Baja fish taco", priceDollars: 5 },
  { name: "Burrito", priceDollars: 11 },
  { name: "Loaded nachos", priceDollars: 9 },
  { name: "Horchata", priceDollars: 4 },
  { name: "Latte", priceDollars: 5 },
  { name: "Cold brew", priceDollars: 5 },
  { name: "Butter croissant", priceDollars: 4 },
  { name: "Cinnamon roll", priceDollars: 5 },
  { name: "Avocado toast", priceDollars: 10 },
  { name: "Granola bowl", priceDollars: 7 },
];

function photoNumber(file: File | string, index: number): number {
  const label = typeof file === "string" ? file : file.name;
  const m = label.match(/upload-(\d+)/i);
  return m ? Number(m[1]) : index + 1;
}

function photoSource(file: File | string): string {
  if (typeof file === "string") return file;
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") return URL.createObjectURL(file);
  return "";
}

function rentalDraftFromPhoto(file: File | string, index: number): DraftItem {
  const identity = UPLOAD_CATALOG[(photoNumber(file, index) - 1 + UPLOAD_CATALOG.length) % UPLOAD_CATALOG.length];
  const suggestion = referenceSuggestion({
    name: identity.name,
    category: identity.category,
    condition: identity.condition,
    kind: "rental",
  });
  const daily = suggestion.amountCents;
  const minDaily = Math.max(100, Math.round((daily * 0.62) / 100) * 100);
  return {
    kind: "rental",
    name: identity.name,
    description: identity.description,
    category: identity.category,
    photoUrl: photoSource(file),
    condition: identity.condition,
    rental: {
      dailyFeeCents: daily,
      minDailyFeeCents: minDaily,
      depositCents: suggestion.depositCents ?? 5000,
      maxDays: 7,
      bindingCheckRequired: /^(Skis|Snowboard)$/.test(identity.category),
    },
    suggestion,
    tags: [identity.category.toLowerCase()],
    available: true,
  };
}

function foodDraftFromPhoto(file: File | string, index: number): DraftItem {
  const pick = FOOD_UPLOADS[(photoNumber(file, index) - 1 + FOOD_UPLOADS.length) % FOOD_UPLOADS.length];
  const draft = foodDraft(pick.name, pick.priceDollars * 100);
  return {
    ...draft,
    photoUrl: photoSource(file) || draft.photoUrl,
    suggestion: referenceSuggestion({ name: pick.name, kind: "food" }),
  };
}

async function importFromPhotos(
  files: (File | string)[],
  sellerKind: SellerKind,
  cb?: Progress,
): Promise<Shop> {
  const started = Date.now();
  const tpl = sellerKind === "local" ? TEMPLATES.gear : TEMPLATES.kitchen;

  cb?.onStep?.("Reading your photos");
  await wait(500, 800);

  cb?.onStep?.("Identifying each item");
  const drafts = files.map((f, i) => (sellerKind === "local" ? rentalDraftFromPhoto(f, i) : foodDraftFromPhoto(f, i)));
  const name = sellerKind === "local" ? "Sam's Gear Closet" : "Corner Kitchen";
  const { shop, items } = buildShop({ name, tpl, drafts, sellerKind });
  await emitItems(items, cb, 300, 600);

  cb?.onStep?.("Pricing with the deals agent");
  await wait(600, 900);

  cb?.onStep?.("Building your storefront");
  await wait(600, 900);

  commitShop(shop, items);
  const ms = Date.now() - started;
  log("Onboarding agent", "Imported photos", `${shop.name}, ${items.length} items from ${files.length} photos`, ms, aiCost(ms));
  return shop;
}

async function importFromDescription(text: string, cb?: Progress): Promise<Shop> {
  const started = Date.now();
  const tpl = pickTemplate(text);

  cb?.onStep?.("Listening to your description");
  await wait(800, 1200);

  cb?.onStep?.("Finding your items");
  const parsed = tpl.key === "gear" ? [] : parseSpokenPrices(text);
  const drafts = parsed.length >= 2 ? parsed : draftsFromTemplate(tpl);
  const named = text.match(/(?:called|named)\s+([A-Z][\w'&]*(?:\s+[A-Z][\w'&]*){0,3})/);
  const name = named ? named[1] : tpl.defaultName;
  const { shop, items } = buildShop({ name, tpl, drafts });
  await emitItems(items, cb, 250, 450);

  cb?.onStep?.("Pricing with the deals agent");
  await wait(600, 900);

  cb?.onStep?.("Building your storefront");
  await wait(600, 900);

  commitShop(shop, items);
  const ms = Date.now() - started;
  log("Onboarding agent", "Built a shop from a description", `${shop.name}, ${items.length} items`, ms, aiCost(ms));
  return shop;
}

async function suggestPrice(item: Partial<Item>): Promise<PriceSuggestion> {
  const ms = await wait(700, 1300);
  const kind = item.kind ?? (item.rental ? "rental" : item.priceCents !== undefined ? "sale" : "rental");
  const suggestion = referenceSuggestion({
    name: item.name,
    category: item.category,
    condition: item.condition,
    kind,
  });
  const headline = kind === "rental" ? perDay(suggestion.amountCents) : money(suggestion.amountCents);
  log("Deals agent", "Suggested a price", `${item.name ?? "Item"}: ${headline}`, ms, aiCost(ms));
  return suggestion;
}

async function updateItem(item: Item): Promise<Item> {
  const ms = await wait(300, 500);
  state().upsertItem(item);
  log("Storefront agent", "Updated an item", item.name, ms);
  return item;
}

// ---------------------------------------------------------------------------
// Storefront instructions
// ---------------------------------------------------------------------------

const LANGUAGE_RULES: { re: RegExp; lang: Lang; label: string }[] = [
  { re: /japanese|日本語/i, lang: "ja", label: "Japanese" },
  { re: /spanish|español|スペイン語/i, lang: "es", label: "Spanish" },
  { re: /french/i, lang: "fr", label: "French" },
  { re: /german/i, lang: "de", label: "German" },
  { re: /korean/i, lang: "ko", label: "Korean" },
  { re: /chinese|mandarin/i, lang: "zh", label: "Chinese" },
];

const PRESET_RULES: { re: RegExp; preset: StorefrontTheme["preset"] }[] = [
  { re: /ski[\s_-]?lodge|lodge|cozy|cabin/i, preset: "ski_lodge" },
  { re: /food[\s_-]?truck|street food|bold/i, preset: "food_truck" },
  { re: /alpine|minimal|clean|white/i, preset: "alpine_minimal" },
  { re: /night[\s_-]?market|neon|dark/i, preset: "night_market" },
];

async function applyStorefrontInstruction(
  shopId: string,
  instruction: string,
): Promise<{ config: StorefrontConfig; changes: string[] }> {
  const ms = await wait(1000, 1600);
  const shop = need(state().shops.find((s) => s.id === shopId), "Shop");
  const text = instruction.trim();
  let config: StorefrontConfig = { ...shop.storefront };
  const changes: string[] = [];

  const preset = PRESET_RULES.find((r) => r.re.test(text))?.preset;
  if (preset) {
    config = { ...config, theme: THEMES[preset] };
    changes.push(`Theme → ${THEME_LABELS[preset]}`);
  }

  const first = text.match(/([a-z]+)\s+first/i);
  if (first) {
    const word = first[1].toLowerCase();
    const index = config.sections.findIndex((s) => s.title.toLowerCase().includes(word) || s.id.includes(word));
    if (index > 0) {
      const sections = config.sections.slice();
      const [moved] = sections.splice(index, 1);
      sections.unshift(moved);
      config = { ...config, sections };
      changes.push(`Sections → ${moved.title} first`);
    } else if (index === 0) {
      changes.push(`Sections: ${config.sections[0].title} is already first`);
    }
  }

  const off = text.match(/(\d{1,2})\s*%\s*off/i);
  if (off) {
    const percentOff = Number(off[1]);
    config = { ...config, promo: { text: `${percentOff}% off`, percentOff, tag: "Today" } };
    changes.push(`Promo → ${percentOff}% off`);
  }

  const wantsTranslate = /translate|translation|language/i.test(text);
  const langs = LANGUAGE_RULES.filter((r) => r.re.test(text));
  if (langs.length > 0 || wantsTranslate) {
    const add = langs.length > 0 ? langs : LANGUAGE_RULES.filter((r) => r.lang === "ja" || r.lang === "es");
    const next = Array.from(new Set<Lang>([...config.languages, ...add.map((r) => r.lang)]));
    if (next.length !== config.languages.length) {
      config = { ...config, languages: next };
      changes.push(`Languages → ${add.map((r) => r.label).join(", ")}`);
    } else {
      changes.push(`Languages: ${add.map((r) => r.label).join(", ")} already on`);
    }
  }

  if (changes.length === 0) {
    const cleaned = text.replace(/[.!\s]+$/g, "");
    const tagline = (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)).slice(0, 60);
    config = { ...config, tagline };
    changes.push(`Tagline → ${tagline}`);
    changes.push("No other rule matched, so I updated the tagline");
  }

  state().upsertShop({ ...shop, name: config.name, storefront: config });
  log("Storefront agent", "Updated the storefront", changes.join("; "), ms, aiCost(ms));
  return { config, changes };
}

// ---------------------------------------------------------------------------
// Visitor agent
// ---------------------------------------------------------------------------

const SKI_WORDS = /ski|snowboard|board|gear|boots?|jacket|rent|スキー|スノボ|スノーボード|ブーツ|ジャケット|レンタル/i;
const FOOD_WORDS = /food|eat|hungry|taco|burrito|coffee|breakfast|lunch|dinner|snack|食|ご飯|ごはん|タコス|コーヒー|朝食|おなか|お腹/i;

function rentalCards(message: string, profile: VisitorProfile): AgentCard[] {
  const { items, shops } = state();
  const days = daysBetween(profile.tripStart, profile.tripEnd);
  const wantsBoard = /snowboard|スノボ|スノーボード/i.test(message);
  const tag = wantsBoard ? "snowboard" : "ski";
  return items
    .filter(
      (i) =>
        i.kind === "rental" &&
        i.available &&
        i.rental &&
        i.tags?.includes(tag) &&
        i.rental.dailyFeeCents * days <= profile.budgetCents,
    )
    .slice(0, 3)
    .map((i) => {
      const shop = shops.find((s) => s.id === i.shopId);
      return {
        kind: "rental" as const,
        itemId: i.id,
        shopId: i.shopId,
        title: i.name,
        subtitle: [shop?.name, conditionLabel(i.condition)].filter(Boolean).join(" · "),
        priceLabel: perDay(i.rental!.dailyFeeCents),
        actions: [
          { label: "Negotiate", href: `/visit/negotiate/${i.id}` },
          { label: "Details", href: `/visit/item/${i.id}` },
        ],
      };
    });
}

function foodCards(message: string): AgentCard[] {
  const { items, shops } = state();
  let ids: string[];
  if (/taco|タコス/i.test(message)) ids = ["ct-al-pastor", "ct-carne-asada", "ct-taco-plate"];
  else if (/coffee|breakfast|コーヒー|朝食/i.test(message)) ids = ["sc-breakfast-burrito", "sc-latte", "sc-croissant"];
  else ids = ["ct-al-pastor", "ct-burrito", "sc-breakfast-burrito", "sc-latte"];

  return ids
    .map((id) => items.find((i) => i.id === id && i.available))
    .filter((i): i is Item => Boolean(i))
    .map((i) => {
      const shop = shops.find((s) => s.id === i.shopId);
      return {
        kind: "food" as const,
        itemId: i.id,
        shopId: i.shopId,
        title: i.name,
        subtitle: shop?.name ?? "",
        priceLabel: money(i.priceCents ?? foodGuessCents(i.name)),
        actions: [{ label: "Order", href: `/visit/order/${i.shopId}` }],
      };
    });
}

const AGENT_TEXT = {
  en: {
    gear: (n: number, budget: string) =>
      `I found ${n} ski options within your ${budget} budget. Pick one and I will negotiate the price.`,
    food: (n: number) => `Here are ${n} places to eat nearby. Pick one and I will place the order.`,
    none: "I can find ski gear or food nearby. What do you need?",
    stepsGear: ["Searched gear listings nearby", "Kept gear within your budget"],
    stepsFood: ["Searched food shops nearby", "Picked popular items"],
    stepsNone: ["Needed a bit more detail"],
    read: "Read your request",
  },
  ja: {
    gear: (n: number, budget: string) =>
      `ご予算${budget}に合うスキー用品を${n}点見つけました。選んでいただければ、価格交渉は私が行います。`,
    food: (n: number) => `近くで食べられるメニューを${n}件見つけました。選んでいただければ注文します。`,
    none: "スキー用品や近くの食事を探せます。何をお探しですか。",
    stepsGear: ["近くのレンタル品を検索", "ご予算内の商品に絞り込み"],
    stepsFood: ["近くの飲食店を検索", "人気メニューを選択"],
    stepsNone: ["もう少し詳しい情報が必要です"],
    read: "ご依頼を確認",
  },
} as const;

async function askVisitorAgent(
  message: string,
  profile: VisitorProfile,
): Promise<{ reply: string; cards: AgentCard[]; steps: string[] }> {
  const ms = await wait(1200, 1800);
  const t = AGENT_TEXT[profile.language === "ja" ? "ja" : "en"];

  const wantsGear = SKI_WORDS.test(message);
  const wantsFood = FOOD_WORDS.test(message);

  const gear = wantsGear ? rentalCards(message, profile) : [];
  const meals = wantsFood ? foodCards(message) : [];
  // Keep to four cards at most when both were asked for.
  const cards = [...gear.slice(0, wantsFood ? 2 : 3), ...meals.slice(0, wantsGear ? 2 : 3)].slice(0, 4);

  const replyParts: string[] = [];
  const steps: string[] = [t.read];
  if (gear.length > 0) {
    replyParts.push(t.gear(Math.min(gear.length, wantsFood ? 2 : 3), money(profile.budgetCents)));
    steps.push(...t.stepsGear);
  }
  if (meals.length > 0) {
    replyParts.push(t.food(Math.min(meals.length, wantsGear ? 2 : 3)));
    steps.push(...t.stepsFood);
  }
  if (cards.length === 0) {
    replyParts.push(t.none);
    steps.push(...t.stepsNone);
  }

  log(
    "Visitor agent",
    cards.length > 0 ? "Searched listings" : "Asked for more detail",
    `${cards.length} matches for "${message.slice(0, 40)}"`,
    ms,
    aiCost(ms),
  );
  return { reply: replyParts.join(" "), cards, steps: steps.slice(0, 4) };
}

// ---------------------------------------------------------------------------
// Negotiation engine (deterministic)
// ---------------------------------------------------------------------------

export const MAX_ROUNDS = 6;

/** The owner moves about a third of the way toward its minimum, never below it. */
export function ownerNext(previous: number, minimum: number): number {
  if (previous <= minimum) return minimum;
  const target = Math.round(previous - (previous - minimum) / 3);
  return Math.max(minimum, Math.min(previous - 1, target));
}

/** In agent mode the owner comes down a third of the full gap each round: $60, $53, $46, $38. */
function ownerOffer(asking: number, minimum: number, round: number): number {
  return Math.max(minimum, Math.ceil(asking - (Math.max(0, asking - minimum) * (round - 1)) / 3));
}

/** The visitor covers 40% of the way to its max on its first move, then 55% of what is left, never above it. */
export function visitorNext(previous: number, maximum: number, round: number): number {
  if (previous >= maximum) return maximum;
  const target = Math.round(previous + (maximum - previous) * (round <= 2 ? 0.4 : 0.55));
  return Math.min(maximum, Math.max(previous + 1, target));
}

export interface PlannedRound {
  n: number;
  by: "owner" | "visitor";
  /** Whole dollars. */
  offer: number;
  /** True when this entry closes the deal. */
  accepts?: boolean;
}

export interface NegotiationPlan {
  rounds: PlannedRound[];
  status: "deal" | "no_deal";
  /** Whole dollars per day. */
  agreedDaily?: number;
}

/**
 * Both sides make one offer per round, owner first. All offers are whole
 * dollars. A deal happens when the visitor's offer reaches the owner's offer,
 * or when the owner's next move would already be at or below the visitor's
 * offer, in which case the owner agrees to it. Limits: asking $60, minimum $38
 * and max $45 play out as 60, 30, 53, 36, 46, 41, then the owner agrees at 41.
 */
export function planNegotiation(input: {
  askingCents: Cents;
  minCents: Cents;
  maxCents: Cents;
  maxRounds?: number;
}): NegotiationPlan {
  const asking = Math.round(input.askingCents / 100);
  const minimum = Math.ceil(input.minCents / 100);
  const maximum = Math.floor(input.maxCents / 100);
  const maxRounds = input.maxRounds ?? MAX_ROUNDS;

  const rounds: PlannedRound[] = [];
  let visitor = 0;

  for (let n = 1; n <= maxRounds; n++) {
    const owner = ownerOffer(asking, minimum, n);
    rounds.push({ n, by: "owner", offer: owner });

    const next = n === 1 ? Math.min(maximum, Math.max(1, Math.round(asking / 2))) : visitorNext(visitor, maximum, n);
    if (next >= owner) {
      rounds.push({ n, by: "visitor", offer: owner, accepts: true });
      return { rounds, status: "deal", agreedDaily: owner };
    }
    visitor = next;
    rounds.push({ n, by: "visitor", offer: visitor });

    if (n < maxRounds && ownerOffer(asking, minimum, n + 1) <= visitor) {
      rounds.push({ n: n + 1, by: "owner", offer: visitor, accepts: true });
      return { rounds, status: "deal", agreedDaily: visitor };
    }
  }
  return { rounds, status: "no_deal" };
}

type MessageKind = "open" | "counter" | "best" | "deal";

// The screen shows each offer as the big price, so messages never repeat it.
const DAY_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven"];

const OWNER_TEXT: Record<"en" | "ja", { open: string; counter: (days: number) => string; best: string; deal: string }> = {
  en: {
    open: "Asking price.",
    counter: (days) => `For a ${DAY_WORDS[days] ?? days}-day rental.`,
    best: "My best price.",
    deal: "Agreed.",
  },
  ja: {
    open: "希望価格です。",
    counter: (days) => `${days}日間のレンタルで。`,
    best: "これが最安値です。",
    deal: "承知しました。",
  },
};

const VISITOR_TEXT: Record<"en" | "ja", { open: string; counters: string[]; deal: string }> = {
  en: {
    open: "Could you start here?",
    counters: ["Could you come closer?", "Could we agree on this?"],
    deal: "Agreed.",
  },
  ja: {
    open: "ここからいかがですか。",
    counters: ["もう少し歩み寄れませんか。", "この金額でいかがですか。"],
    deal: "承知しました。",
  },
};

function ownerMessage(kind: MessageKind, days: number, lang: "en" | "ja"): string {
  const t = OWNER_TEXT[lang];
  if (kind === "open") return t.open;
  if (kind === "best") return t.best;
  if (kind === "deal") return t.deal;
  return t.counter(days);
}

function visitorMessage(kind: "open" | "counter" | "deal", n: number, lang: "en" | "ja"): string {
  const t = VISITOR_TEXT[lang];
  if (kind === "open") return t.open;
  if (kind === "deal") return t.deal;
  return t.counters[Math.min(n - 2, t.counters.length - 1)];
}

function roundFromPlan(p: PlannedRound, minimumDollars: number, days: number, lang: "en" | "ja"): NegotiationRound {
  const offerCents = p.offer * 100;
  const at = new Date().toISOString();
  if (p.by === "owner") {
    const kind: MessageKind = p.accepts ? "deal" : p.n === 1 ? "open" : p.offer <= minimumDollars ? "best" : "counter";
    return { n: p.n, by: "owner", offerCents, message: ownerMessage(kind, days, lang), at };
  }
  const kind = p.accepts ? "deal" : p.n === 1 ? "open" : "counter";
  return { n: p.n, by: "visitor", offerCents, message: visitorMessage(kind, p.n, lang), at };
}

const ROUND_MS = 450;

async function startNegotiation(
  input: { itemId: string; days: number; visitorMaxCents: Cents; mode: "agent" | "manual" },
  cb?: { onRound?: (r: NegotiationRound) => void },
): Promise<Negotiation> {
  const item = need(state().items.find((i) => i.id === input.itemId), "Item");
  const terms = need(item.rental, "Rental terms");
  const lang = visitorLang();
  const minimumDollars = Math.ceil((terms.minDailyFeeCents ?? terms.dailyFeeCents) / 100);
  const id = `neg-${uid()}`;

  let negotiation: Negotiation = {
    id,
    itemId: item.id,
    days: input.days,
    askingCents: terms.dailyFeeCents,
    visitorMaxCents: input.visitorMaxCents,
    rounds: [],
    maxRounds: MAX_ROUNDS,
    mode: input.mode,
    status: "running",
  };

  log("Deals agent", "Started a negotiation", `${item.name}, ${input.days} days, ${input.mode} mode`);

  if (input.mode === "manual") {
    await wait(500, 800);
    const open = Math.round(terms.dailyFeeCents / 100);
    const round: NegotiationRound = {
      n: 1,
      by: "owner",
      offerCents: open * 100,
      message: ownerMessage("open", input.days, lang),
      at: new Date().toISOString(),
    };
    negotiation = { ...negotiation, rounds: [round] };
    state().upsertNegotiation(negotiation);
    cb?.onRound?.(round);
    log("Owner agent", `Opened at ${perDay(round.offerCents)}`, item.name);
    return negotiation;
  }

  const plan = planNegotiation({
    askingCents: terms.dailyFeeCents,
    minCents: terms.minDailyFeeCents ?? terms.dailyFeeCents,
    maxCents: input.visitorMaxCents,
    maxRounds: MAX_ROUNDS,
  });
  const started = Date.now();
  state().upsertNegotiation(negotiation);

  for (const planned of plan.rounds) {
    await sleep(ROUND_MS);
    const round = roundFromPlan(planned, minimumDollars, input.days, lang);
    negotiation = { ...negotiation, rounds: [...negotiation.rounds, round] };
    state().upsertNegotiation(negotiation);
    cb?.onRound?.(round);

    const price = perDay(round.offerCents);
    if (round.by === "owner") {
      log("Owner agent", planned.accepts ? `Accepted ${price}` : planned.n === 1 ? `Opened at ${price}` : `Countered ${price}`, item.name, ROUND_MS, aiCost(ROUND_MS));
    } else {
      log("Visitor agent", planned.accepts ? `Accepted ${price}` : `Offered ${price}`, item.name, ROUND_MS, aiCost(ROUND_MS));
    }
  }

  const ms = Date.now() - started;
  if (plan.status === "deal" && plan.agreedDaily !== undefined) {
    negotiation = { ...negotiation, status: "deal", agreedDailyCents: plan.agreedDaily * 100 };
    log(
      "Deals agent",
      "Deal reached",
      `${perDay(plan.agreedDaily * 100)} on ${item.name.toLowerCase()} after ${plan.rounds[plan.rounds.length - 1].n} rounds`,
      ms,
      aiCost(ms),
    );
  } else {
    negotiation = { ...negotiation, status: "no_deal" };
    log("Deals agent", "No deal", `${item.name}, ${MAX_ROUNDS} rounds`, ms, aiCost(ms));
  }
  state().upsertNegotiation(negotiation);
  return negotiation;
}

async function submitManualOffer(negotiationId: string, offerCents: Cents, message: string): Promise<Negotiation> {
  const ms = await wait(900, 1300);
  const current = need(state().negotiations.find((n) => n.id === negotiationId), "Negotiation");
  if (current.status !== "running") return current;

  const item = need(state().items.find((i) => i.id === current.itemId), "Item");
  const terms = need(item.rental, "Rental terms");
  const lang = visitorLang();
  const minimumDollars = Math.ceil((terms.minDailyFeeCents ?? terms.dailyFeeCents) / 100);

  const lastOwner = [...current.rounds].reverse().find((r) => r.by === "owner");
  const n = lastOwner?.n ?? 1;
  const ownerLastDollars = Math.round((lastOwner?.offerCents ?? current.askingCents) / 100);
  const offerDollars = Math.round(offerCents / 100);
  const at = new Date().toISOString();

  const visitorRound: NegotiationRound = {
    n,
    by: "visitor",
    offerCents: offerDollars * 100,
    message: message.trim() || visitorMessage(n === 1 ? "open" : "counter", n, lang),
    at,
  };
  let rounds = [...current.rounds, visitorRound];
  log("Visitor agent", `Offered ${perDay(visitorRound.offerCents)}`, item.name);

  const counter = Math.max(minimumDollars, ownerNext(ownerLastDollars, minimumDollars));
  let next: Negotiation;

  if (offerDollars >= ownerLastDollars || (offerDollars >= counter && offerDollars >= minimumDollars)) {
    // The owner's agent accepts. A visitor never pays more than the owner's last offer.
    const price = Math.min(offerDollars, ownerLastDollars);
    rounds = [
      ...rounds,
      { n: n + 1, by: "owner", offerCents: price * 100, message: ownerMessage("deal", current.days, lang), at: new Date().toISOString() },
    ];
    next = { ...current, rounds, status: "deal", agreedDailyCents: price * 100 };
    log("Owner agent", `Accepted ${perDay(price * 100)}`, item.name, ms, aiCost(ms));
    log("Deals agent", "Deal reached", `${perDay(price * 100)} on ${item.name.toLowerCase()}`);
  } else if (n >= current.maxRounds) {
    next = { ...current, rounds, status: "no_deal" };
    log("Deals agent", "No deal", `${item.name}, ${n} rounds`, ms, aiCost(ms));
  } else {
    const kind: MessageKind = counter <= minimumDollars ? "best" : "counter";
    rounds = [
      ...rounds,
      { n: n + 1, by: "owner", offerCents: counter * 100, message: ownerMessage(kind, current.days, lang), at: new Date().toISOString() },
    ];
    next = { ...current, rounds };
    log("Owner agent", `Countered ${perDay(counter * 100)}`, item.name, ms, aiCost(ms));
  }

  state().upsertNegotiation(next);
  return next;
}

// ---------------------------------------------------------------------------
// Rentals and money
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

async function createRentalHold(input: { itemId: string; days: number; negotiationId?: string }): Promise<Rental> {
  const ms = await wait(900, 1400);
  const item = need(state().items.find((i) => i.id === input.itemId), "Item");
  const terms = need(item.rental, "Rental terms");
  const negotiation = input.negotiationId
    ? state().negotiations.find((n) => n.id === input.negotiationId)
    : undefined;

  const dailyFeeCents = negotiation?.agreedDailyCents ?? terms.dailyFeeCents;
  const holdCents = input.days * dailyFeeCents + terms.depositCents;
  const pickupAt = state().visitor.tripStart;

  const rental: Rental = {
    id: `rental-${uid()}`,
    itemId: item.id,
    shopId: item.shopId,
    negotiationId: input.negotiationId,
    days: input.days,
    dailyFeeCents,
    depositCents: terms.depositCents,
    holdCents,
    status: "reserved",
    pickupCode: String(Math.floor(100000 + Math.random() * 900000)),
    pickupAt,
    returnBy: new Date(Date.parse(pickupAt) + input.days * DAY_MS).toISOString(),
    pickupPhotos: [],
    returnPhotos: [],
  };
  state().upsertRental(rental);
  log("Payments", "Card hold placed", `${money(holdCents)} held, not charged`, ms);
  return rental;
}

function findRental(id: string): Rental {
  return need(state().rentals.find((r) => r.id === id), "Rental");
}

async function markPickedUp(rentalId: string, photos: string[]): Promise<Rental> {
  const ms = await wait(500, 900);
  const rental: Rental = { ...findRental(rentalId), status: "picked_up", pickupPhotos: photos };
  state().upsertRental(rental);
  log("Owner agent", "Pickup confirmed", `${photos.length} photos saved`, ms);
  return rental;
}

async function submitReturn(rentalId: string, photos: string[]): Promise<Rental> {
  const ms = await wait(1200, 1800);
  const flagged = photos.some((p) => /scratch/i.test(p));
  const rental: Rental = {
    ...findRental(rentalId),
    status: "returned",
    returnPhotos: photos,
    damageCheck: flagged
      ? { result: "review", note: "Possible scratch found. The owner will review the photos." }
      : { result: "clear", note: "Return photos match pickup photos." },
  };
  state().upsertRental(rental);
  log("Owner agent", flagged ? "Damage check flagged" : "Damage check clear", `${photos.length} return photos compared`, ms, aiCost(ms));
  return rental;
}

async function settleRental(rentalId: string, extraChargeCents = 0): Promise<Rental> {
  const ms = await wait(900, 1200);
  const current = findRental(rentalId);
  const feeTotal = current.days * current.dailyFeeCents;
  // A charge can never be larger than the hold.
  const capturedCents = Math.min(current.holdCents, feeTotal + extraChargeCents);
  const releasedCents = current.holdCents - capturedCents;
  const rental: Rental = { ...current, status: "settled", capturedCents, releasedCents };
  state().upsertRental(rental);
  log("Payments", "Hold settled", `${money(capturedCents)} charged, ${money(releasedCents)} released`, ms);
  return rental;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

async function placeFoodOrder(shopId: string, lines: OrderLine[], pickupTime: string): Promise<FoodOrder> {
  const ms = await wait(700, 1100);
  const { shops, items } = state();
  const shop = need(shops.find((s) => s.id === shopId), "Shop");
  const totalCents = lines.reduce((sum, l) => {
    const price = items.find((i) => i.id === l.itemId)?.priceCents ?? 0;
    return sum + price * l.qty;
  }, 0);

  const order: FoodOrder = {
    id: `order-${uid()}`,
    shopId,
    lines,
    totalCents,
    pickupTime,
    pickupCode: `${initials(shop.name)}-${Math.floor(100 + Math.random() * 900)}`,
    status: "placed",
  };
  state().upsertOrder(order);
  log("Storefront agent", "Order received", `${shop.name}, ${money(totalCents)}`, ms);
  return order;
}

export const mockApi = {
  importFromWebsite,
  importFromPhotos,
  importFromDescription,
  suggestPrice,
  applyStorefrontInstruction,
  updateItem,
  askVisitorAgent,
  startNegotiation,
  submitManualOffer,
  createRentalHold,
  markPickedUp,
  submitReturn,
  settleRental,
  placeFoodOrder,
};

export type MockApi = typeof mockApi;
