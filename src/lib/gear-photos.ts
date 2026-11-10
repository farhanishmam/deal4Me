import type { Item } from "./types";

export const SKI_GEAR_PHOTO = "/listings/ski-gear.png";
export const SKI_GEAR_GALLERY = [SKI_GEAR_PHOTO, "/demo/photos/skis.jpg", "/demo/photos/rent-gear.jpg"];

type GearPhotoItem = Pick<Item, "photoUrl"> & Partial<Pick<Item, "id" | "kind" | "name" | "category" | "tags" | "photoUrls">>;

/** Separate source photographs for each imported rental package. See public/listings/SOURCES.md. */
export const GEAR_PACKAGE_PHOTOS: Record<string, string> = {
  "sport-basic-ski-package": SKI_GEAR_PHOTO,
  "sport-basic-skis-only": "/listings/ski/pexels-6113888.jpg",
  "performance-ski-package": "/listings/ski/pexels-257961.jpg",
  "performance-skis-only": "/listings/ski/unsplash-OKa6B9tbt2o.jpg",
  "demo-high-performance-ski-package": "/listings/ski/unsplash-9Osc8kG7LeY.jpg",
  "demo-high-performance-skis-only": "/listings/ski/unsplash-zmGEOFxXNDE.jpg",
  "touring-ski-package": "/listings/ski/pexels-39895408.jpg",
  "junior-ski-package": "/listings/ski/pexels-10957169.jpg",
  "junior-performance-ski-package": "/listings/ski/pexels-19822708.jpg",
  "junior-skis-only": "/listings/ski/pexels-11156951.jpg",
  "junior-performance-skis-only": "/listings/ski/pexels-19535148.jpg",
  "black-skis": "/demo/photos/skis.jpg",
  "ski-and-boot-set": "/demo/photos/rent-gear.jpg",
};

const SKI_PHOTO_POOL = [
  "/listings/ski/pexels-6113888.jpg",
  "/listings/ski/pexels-257961.jpg",
  "/listings/ski/unsplash-OKa6B9tbt2o.jpg",
  "/listings/ski/unsplash-9Osc8kG7LeY.jpg",
  "/listings/ski/unsplash-zmGEOFxXNDE.jpg",
  "/listings/ski/pexels-39895408.jpg",
  "/listings/ski/pexels-14846103.jpg",
  "/listings/ski/unsplash-aGe00J3SuEc.jpg",
  "/listings/ski/pexels-11169835.jpg",
  "/listings/ski/unsplash-4fMr2hAC78U.jpg",
];

function packageKey(name = ""): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Stable per-item selection keeps photo-less future imports from all sharing one cover. */
export function gearPhotoFor(item: Partial<Pick<Item, "id" | "name" | "category" | "tags">>): string {
  const named = GEAR_PACKAGE_PHOTOS[packageKey(item.name)];
  if (named) return named;
  const description = [item.name, item.category, ...(item.tags ?? [])].filter(Boolean).join(" ");
  if (/\bsnowboards?\b/i.test(description)) return "/listings/ski/pexels-28199263.jpg";
  let hash = 0;
  for (const character of item.id || description) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return SKI_PHOTO_POOL[(hash >>> 0) % SKI_PHOTO_POOL.length];
}

export function isItemPhoto(photo: string | undefined): photo is string {
  return !!photo?.trim() && photo.trim() !== "/brand/no-photo.svg";
}

export function isSkiGear(item: Partial<Pick<Item, "kind" | "name" | "category" | "tags">>): boolean {
  if (item.kind === "food") return false;
  return /\b(skis?|skiing|snowboards?|snowboarding|snowshoes?)\b/i.test(
    [item.name, item.category, ...(item.tags ?? [])].filter(Boolean).join(" "),
  );
}

/** Preserve owner uploads; ski imports without a photo get a package-specific cover. */
export function withGearPhoto<T extends GearPhotoItem>(item: T): T {
  if (!isSkiGear(item)) return item;
  const cover = [item.photoUrl, ...(item.photoUrls ?? [])].find(isItemPhoto);
  return { ...item, photoUrl: cover ?? gearPhotoFor(item) };
}
