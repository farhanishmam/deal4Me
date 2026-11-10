import type { Api, Progress } from "@/lib/api-contract";
import { logStep, postForm } from "@/lib/real/http";
import { commitImportedShop, createShopDraft, rentalTerms } from "@/lib/real/onboarding-records";
import type { Condition, Item, PriceSuggestion, SellerKind } from "@/lib/types";

type Kind = "food" | "rental" | "sale";

interface Appraisal {
  item: { name: string; category: string; condition: string; searchQuery: string };
  suggestion: PriceSuggestion;
}

const MAX_SIDE = 1280;
const CONCURRENCY = 3;
const CONDITIONS: Condition[] = ["new", "like_new", "good", "used"];

async function toBlob(file: File | string): Promise<Blob> {
  if (typeof file !== "string") return file;
  const response = await fetch(file);
  if (!response.ok) throw new Error("Could not read one of your photos. Choose it again.");
  return response.blob();
}

async function downscale(blob: Blob): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(blob.type)) throw new Error("Choose a JPG, PNG, WebP, or GIF photo.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("One photo could not be opened. Choose a valid image file.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  // Preserve small originals, including the sample bytes used by the server cache.
  if (scale === 1 && blob.size <= 5 * 1024 * 1024) {
    bitmap.close();
    return blob;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare your photo. Try another browser.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not prepare your photo.")), "image/jpeg", 0.85),
  );
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not save your photo. Choose it again."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not save your photo."));
    reader.readAsDataURL(blob);
  });
}

/** A seller's own picture for one item: checked, downscaled, returned as a data URL. */
export async function itemPhotoDataUrl(file: File): Promise<string> {
  return dataUrl(await downscale(file));
}

async function appraiseOne(file: File | string, kind: Kind): Promise<{ appraisal: Appraisal; photoUrl: string }> {
  const photo = await downscale(await toBlob(file));
  const form = new FormData();
  form.append("photo", new File([photo], "photo", { type: photo.type }));
  form.append("kind", kind);
  const [appraisal, photoUrl] = await Promise.all([
    postForm<Appraisal>("/api/ai/appraise", form),
    dataUrl(photo),
  ]);
  if (!appraisal.item.name?.trim() || !Number.isFinite(appraisal.suggestion.amountCents) || appraisal.suggestion.amountCents <= 0) {
    throw new Error("An item could not be identified or priced. Try a clearer photo.");
  }
  return { appraisal, photoUrl };
}

/** Reuse the image appraisal endpoint when an owner switches rent to sell. */
export async function appraisePhotoForSale(photoUrl: string): Promise<PriceSuggestion> {
  const { appraisal } = await appraiseOne(photoUrl, "sale");
  return appraisal.suggestion;
}

async function importFromPhotos(files: (File | string)[], sellerKind: SellerKind, cb?: Progress) {
  if (!files.length) throw new Error("Choose at least one photo.");
  if (files.length > 12) throw new Error("Choose up to 12 photos.");
  const started = Date.now();
  cb?.onStep?.("Reading your photos");
  cb?.onStep?.("Identifying each item");

  const results: Awaited<ReturnType<typeof appraiseOne>>[] = new Array(files.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      results[index] = await appraiseOne(files[index], sellerKind === "local" ? "rental" : "food");
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  cb?.onStep?.("Pricing with the deals agent");

  const shop = createShopDraft({
    name: `${results[0].appraisal.item.category.trim() || "Your"} shop`,
    tagline: sellerKind === "local" ? "Rent gear from a local owner." : "Freshly made by a local kitchen.",
    sellerKind,
  });
  const items: Item[] = results.map(({ appraisal, photoUrl }, index) => {
    const { item, suggestion } = appraisal;
    const base: Item = {
      id: `${shop.id}-${index}`,
      shopId: shop.id,
      kind: sellerKind === "local" ? "rental" : "food",
      name: item.name.trim(),
      description: suggestion.reasoning,
      category: item.category.trim() || "Items",
      photoUrl,
      suggestion,
      available: true,
    };
    return sellerKind === "local"
      ? { ...base, condition: CONDITIONS.includes(item.condition as Condition) ? item.condition as Condition : undefined, rental: rentalTerms(suggestion.amountCents, suggestion) }
      : { ...base, priceCents: suggestion.amountCents };
  });
  const finalShop = await commitImportedShop(shop, items, cb);
  logStep("Onboarding agent", "Imported photos", `${finalShop.name}, ${items.length} items from ${files.length} photos`, Date.now() - started);
  return finalShop;
}

export const realPhotos = { importFromPhotos } satisfies Pick<Api, "importFromPhotos">;
