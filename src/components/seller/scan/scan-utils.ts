import { createItem } from "@/lib/real/catalog";
import { postForm } from "@/lib/real/http";
import { rentalTerms } from "@/lib/real/onboarding-records";
import { useStore } from "@/lib/store";
import type { Condition, Item, ItemKind, PriceEstimates, PriceSuggestion } from "@/lib/types";

/** What the item is listed as. The photo decides between food and goods; the seller picks rent or sale. */
export type ScanKind = Extract<ItemKind, "rental" | "sale" | "food">;

export const SAMPLES: { src: string; label: string }[] = [
  { src: "/demo/photos/skis.jpg", label: "Skis" },
  { src: "/demo/photos/rent-gear.jpg", label: "Ski and boot set" },
  { src: "/demo/photos/find-food.jpg", label: "Taco plate" },
];

export interface Photo {
  blob: Blob;
  url: string;
}

export interface Appraisal {
  item: { name: string; category: string; condition: string; searchQuery: string };
  /** What the photo is: food has one menu price, anything else has rent and sale estimates. */
  kind: ScanKind;
  suggestion: PriceSuggestion;
  estimates?: PriceEstimates;
  basis?: string;
}

/** The estimate behind a listing choice. Food has only its menu price. */
export function estimateFor(appraisal: Appraisal, kind: ScanKind): PriceSuggestion {
  if (kind === "food") return appraisal.suggestion;
  const estimate = appraisal.estimates?.[kind];
  if (!estimate) throw new Error("The price estimate is incomplete. Try the photo again.");
  return estimate;
}

const MAX_SIDE = 1280;
const CONDITIONS: Condition[] = ["new", "like_new", "good", "used"];

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read your photo. Choose it again."));
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read your photo.")));
    reader.readAsDataURL(blob);
  });
}

/** Draws any image source onto a canvas no larger than 1280px and returns it as a JPEG. */
export async function toJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare your photo. Try another browser.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not prepare your photo."))), "image/jpeg", 0.85),
  );
}

export async function photoFromBlob(blob: Blob): Promise<Photo> {
  return { blob, url: await dataUrl(blob) };
}

/** A photo the seller picked or took. It is shrunk to a JPEG so uploads stay quick. */
export async function photoFromFile(file: Blob): Promise<Photo> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That photo could not be opened. Choose a JPG, PNG or WebP image.");
  }
  try {
    return photoFromBlob(await toJpeg(bitmap, bitmap.width, bitmap.height));
  } finally {
    bitmap.close();
  }
}

/** A sample keeps its original bytes, which the server recognises. */
export async function photoFromSample(src: string): Promise<Photo> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not load the sample photo.");
  const blob = await response.blob();
  return photoFromBlob(blob.type ? blob : new Blob([blob], { type: "image/jpeg" }));
}

/** The photo alone decides what the item is, so the backend is asked with kind "auto". */
export async function appraisePhoto(photo: Photo): Promise<Appraisal> {
  const form = new FormData();
  form.append("photo", new File([photo.blob], "photo", { type: photo.blob.type }));
  form.append("kind", "auto");
  const appraisal = await postForm<Appraisal>("/api/ai/appraise", form);
  const { item, suggestion } = appraisal;
  const priced = (p?: PriceSuggestion) => Number.isFinite(p?.amountCents) && (p?.amountCents ?? 0) > 0;
  const complete = appraisal.kind === "food" ? priced(suggestion) : priced(appraisal.estimates?.rental) && priced(appraisal.estimates?.sale);
  if (!item?.name?.trim() || !complete) {
    throw new Error("The item could not be identified or priced. Try a clearer photo.");
  }
  return appraisal;
}

/** Whole dollars or dollars and cents typed by the seller -> cents, or undefined when invalid. */
export function parsePrice(text: string): number | undefined {
  const value = Number(text.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100);
}

export function centsToText(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Builds the item the same way photo import does, with a unique id. */
export function buildItem(shopId: string, kind: ScanKind, photo: Photo, appraisal: Appraisal, amountCents: number): Item {
  const { item } = appraisal;
  const suggestion = estimateFor(appraisal, kind);
  const condition = CONDITIONS.includes(item.condition as Condition) ? (item.condition as Condition) : undefined;
  const base: Item = {
    id: `${shopId}-scan-${crypto.randomUUID().slice(0, 8)}`,
    shopId,
    kind,
    name: item.name.trim(),
    description: "",
    category: item.category?.trim() || "Items",
    photoUrl: photo.url,
    suggestion,
    available: true,
  };
  if (kind === "rental") return { ...base, condition, rental: rentalTerms(amountCents, suggestion) };
  if (kind === "sale") return { ...base, condition, priceCents: amountCents };
  return { ...base, priceCents: amountCents };
}

/**
 * Adds a new item to the store. The server appends it and lists it in a storefront
 * section for its category, so items saved from another device are kept.
 */
export async function listNewItem(shopId: string, item: Item): Promise<Item> {
  if (!useStore.getState().shops.some((s) => s.id === shopId)) throw new Error("Your store is not loaded yet. Try again in a moment.");
  return createItem(item);
}
