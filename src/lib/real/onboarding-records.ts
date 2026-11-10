import type { Progress } from "@/lib/api-contract";
import { saveShop } from "@/lib/real/catalog";
import { logStep, postJson } from "@/lib/real/http";
import { useStore } from "@/lib/store";
import { selectSellerShop } from "@/lib/seller";
import type { Item, PriceSuggestion, SellerKind, Shop, StorefrontSection, StorefrontTheme } from "@/lib/types";

export interface ExtractedItem {
  name: string;
  description: string;
  category: string;
  kind: Item["kind"];
  priceUsd: number | null;
  photoUrl?: string;
}

// A presentation default for new shops. Inventory always comes from the backend.
const DEFAULT_THEME: StorefrontTheme = {
  preset: "alpine_minimal",
  primary: "#1d3b53",
  background: "#ffffff",
  surface: "#f5f7f9",
  text: "#0f1a24",
  accent: "#6fa3c7",
  font: "sans",
  radius: "sm",
};

export const categorySlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 140).replace(/^-|-$/g, "") || "items";

export function createShopDraft(input: {
  name: string;
  tagline: string;
  sellerKind: SellerKind;
  theme?: StorefrontTheme;
  bannerText?: string;
  heroPhotoUrl?: string;
}): Shop {
  const name = input.name.trim();
  if (!name) throw new Error("The backend did not return a shop name. Try again.");
  const id = `${categorySlug(name)}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    slug: id,
    name,
    sellerKind: input.sellerKind,
    ownerFirstName: "",
    neighborhood: "",
    rating: 0,
    distanceKm: 0,
    storefront: {
      shopId: id,
      slug: id,
      name,
      tagline: input.tagline.trim(),
      bannerText: input.bannerText,
      heroPhotoUrl: input.heroPhotoUrl,
      theme: input.theme ?? DEFAULT_THEME,
      sections: [],
      languages: ["en"],
      badges: { agentReady: true },
    },
  };
}

export async function suggestItemPrice(item: Partial<Item>): Promise<PriceSuggestion> {
  const kind = item.kind ?? (item.rental ? "rental" : "sale");
  const out = await postJson<PriceSuggestion & { ms: number; costUsd: number }>("/api/ai/suggest-price", {
    name: item.name,
    category: item.category,
    condition: item.condition,
    kind,
  });
  const { ms, costUsd, ...suggestion } = out;
  if (!Number.isFinite(suggestion.amountCents) || suggestion.amountCents <= 0) throw new Error("The backend did not return a valid price.");
  logStep("Deals agent", "Suggested a price", `${item.name ?? "Item"}: ${suggestion.amountCents / 100} dollars`, ms, costUsd);
  return suggestion;
}

export function rentalTerms(amountCents: number, suggestion?: PriceSuggestion): NonNullable<Item["rental"]> {
  return {
    dailyFeeCents: amountCents,
    minDailyFeeCents: Math.min(amountCents, Math.max(100, Math.round(amountCents * 0.62 / 100) * 100)),
    depositCents: suggestion?.depositCents ?? Math.round(amountCents * 8 / 1000) * 1000,
    maxDays: 7,
    bindingCheckRequired: false,
  };
}

export async function commitImportedShop(shop: Shop, items: Item[], cb?: Progress): Promise<Shop> {
  if (!items.length) throw new Error("No items were found. Add item names and prices, then try again.");
  const sections: StorefrontSection[] = [];
  for (const item of items) {
    const existing = sections.find((section) => section.title === item.category);
    if (existing) existing.itemIds.push(item.id);
    else sections.push({ id: `${categorySlug(item.category)}-${sections.length}`, title: item.category, itemIds: [item.id] });
  }
  const finalShop = { ...shop, storefront: { ...shop.storefront, sections } };
  cb?.onStep?.("Building your storefront");
  const savedShop = await saveShop(finalShop, items);
  const store = useStore.getState();
  items.forEach((item, index) => {
    store.upsertItem(item);
    cb?.onItem?.(item, index);
  });
  selectSellerShop(savedShop.id);
  return savedShop;
}

export async function importExtractedShop(input: {
  name: string;
  tagline: string;
  items: ExtractedItem[];
  theme?: StorefrontTheme;
  bannerText?: string;
  heroPhotoUrl?: string;
}, cb?: Progress): Promise<Shop> {
  if (!input.items.length) throw new Error("No items were found. Add item names and prices, then try again.");
  const shop = createShopDraft({ ...input, sellerKind: input.items.some((item) => item.kind === "food") ? "business" : "local" });
  const items = await Promise.all(input.items.map(async (source, index): Promise<Item> => {
    const name = source.name.trim();
    if (!name) throw new Error("The backend returned an item without a name. Try again.");
    const base: Item = {
      id: `${shop.id}-${index}`,
      shopId: shop.id,
      name,
      description: source.description,
      category: source.category.trim() || "Items",
      kind: source.kind,
      photoUrl: source.photoUrl ?? "",
      available: true,
    };
    const suggestion = source.priceUsd === null ? await suggestItemPrice(base) : undefined;
    const amountCents = suggestion?.amountCents ?? Math.round((source.priceUsd ?? 0) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error(`Add a positive price for ${name}.`);
    return source.kind === "rental"
      ? { ...base, rental: rentalTerms(amountCents, suggestion), suggestion }
      : { ...base, priceCents: amountCents, suggestion };
  }));
  return commitImportedShop(shop, items, cb);
}
