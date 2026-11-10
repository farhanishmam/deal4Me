import type { Api } from "@/lib/api-contract";
import { THEMES } from "@/lib/storefront-themes";
import { saveShop } from "@/lib/real/catalog";
import { flushPendingShopSave } from "@/lib/shop-sync";
import { useStore } from "@/lib/store";
import type { Lang, Rental, StorefrontConfig } from "@/lib/types";
import { logStep, postForm, postJson } from "@/lib/real/http";

interface InstructionReply {
  preset: keyof typeof THEMES | null;
  theme: { primary: string | null; background: string | null; surface: string | null; text: string | null; accent: string | null } | null;
  font: "sans" | "serif" | "rounded" | null;
  radius: "sm" | "md" | "lg" | null;
  name: string | null;
  tagline: string | null;
  bannerText: string | null;
  sectionOrder: string[] | null;
  promo: { text: string; percentOff: number; tag: string | null } | null;
  addLanguages: Lang[] | null;
  changes: string[];
  ms?: number;
  costUsd?: number;
}

async function applyStorefrontInstruction(shopId: string, instruction: string) {
  const before = useStore.getState().shops.find((s) => s.id === shopId);
  if (!before) throw new Error("Shop not found");
  const r = await postJson<InstructionReply>("/api/ai/storefront-instruction", { instruction, config: before.storefront });
  await flushPendingShopSave(shopId);
  // AI work may outlast a manual edit. Apply its requested fields to the latest shop.
  const shop = useStore.getState().shops.find((s) => s.id === shopId);
  if (!shop) throw new Error("Shop not found");

  let config: StorefrontConfig = { ...shop.storefront };
  let theme = r.preset && THEMES[r.preset] ? { ...THEMES[r.preset] } : { ...config.theme };
  if (r.theme) {
    for (const key of ["primary", "background", "surface", "text", "accent"] as const) {
      const value = r.theme[key];
      if (value) theme[key] = value;
    }
  }
  if (r.font) theme = { ...theme, font: r.font };
  if (r.radius) theme = { ...theme, radius: r.radius };
  config = { ...config, theme };
  if (r.name) config = { ...config, name: r.name };
  if (r.tagline) config = { ...config, tagline: r.tagline };
  if (r.bannerText) config = { ...config, bannerText: r.bannerText };
  if (r.sectionOrder) {
    const byId = new Map(config.sections.map((s) => [s.id, s]));
    const ordered = r.sectionOrder.flatMap((id) => {
      const s = byId.get(id);
      byId.delete(id);
      return s ? [s] : [];
    });
    config = { ...config, sections: [...ordered, ...byId.values()] };
  }
  if (r.promo) config = { ...config, promo: { text: r.promo.text, percentOff: r.promo.percentOff, ...(r.promo.tag ? { tag: r.promo.tag } : {}) } };
  if (r.addLanguages?.length) config = { ...config, languages: Array.from(new Set<Lang>([...config.languages, ...r.addLanguages])) };

  const changes = r.changes.length > 0 ? r.changes : ["No change needed"];
  const saved = await saveShop({ ...shop, name: config.name, storefront: config });
  logStep("Storefront agent", "Updated the storefront", changes.join("; "), r.ms, r.costUsd);
  return { config: saved.storefront, changes };
}

const RASTER = /^data:image\/(jpeg|png|webp|gif);base64,/i;
const isRaster = (p: string) => RASTER.test(p);

async function toBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Could not read a photo");
  return res.blob();
}

async function submitReturn(rentalId: string, photos: string[]): Promise<Rental> {
  const current = useStore.getState().rentals.find((r) => r.id === rentalId);
  if (!current) throw new Error("Rental not found");
  if (current.status !== "picked_up") throw new Error("Only a picked-up rental can be returned");
  if (photos.length === 0 || photos.length > 3 || !photos.every(isRaster)) throw new Error("Choose up to 3 JPEG, PNG, WebP or GIF photos");
  const item = useStore.getState().items.find((i) => i.id === current.itemId);
  if (!item) throw new Error("Rental item not found");
  if (!current.pickupPhotos.every(isRaster)) throw new Error("Pickup photos are unavailable for comparison");
  const pickup = current.pickupPhotos.slice(0, 3);

  const form = new FormData();
  form.set("itemName", item.name);
  (await Promise.all(pickup.map(toBlob))).forEach((b, i) => form.append("pickup", b, `pickup-${i}`));
  (await Promise.all(photos.slice(0, 3).map(toBlob))).forEach((b, i) => form.append("return", b, `return-${i}`));
  const r = await postForm<{ result: "clear" | "review"; note: string; ms?: number; costUsd?: number }>("/api/ai/damage-check", form);

  const rental = await postJson<Rental>(`/api/data/rentals/${encodeURIComponent(rentalId)}/return`, {
    photos,
    damageCheck: { result: r.result, note: r.note },
  });
  useStore.getState().upsertRental(rental);
  logStep("Owner agent", r.result === "review" ? "Damage check flagged" : "Damage check clear", `${photos.length} return photos compared`, r.ms, r.costUsd);
  return rental;
}

export const realStudio = {
  applyStorefrontInstruction,
  submitReturn,
} satisfies Pick<Api, "applyStorefrontInstruction" | "submitReturn">;
