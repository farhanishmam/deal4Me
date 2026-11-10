import type { Item } from "./types";
import { gearPhotoFor, isItemPhoto, isSkiGear } from "./gear-photos";

// Photos for the visitor app. Larger surfaces keep using the item art in /demo/items.
export const PHOTOS = {
  rentGear: "/demo/photos/rent-gear.jpg",
  findFood: "/demo/photos/find-food.jpg",
  sugarHouse: "/demo/photos/sugar-house.jpg",
  skis: "/demo/photos/skis.jpg",
} as const;

type ItemPhotos = Pick<Item, "photoUrl"> & Partial<Pick<Item, "id" | "photoUrls" | "kind" | "name" | "category" | "tags">>;

/** Cover first, followed by distinct gallery photos. */
export function photosFor(item: ItemPhotos): string[] {
  const photos = [...new Set([item.photoUrl, ...(item.photoUrls ?? [])].filter(isItemPhoto).map((photo) => photo.trim()))];
  return photos.length ? photos : [isSkiGear(item) ? gearPhotoFor(item) : "/brand/no-photo.svg"];
}

/** The same cover is used by listing cards and the item's gallery. */
export function thumbFor(item: ItemPhotos): string {
  return photosFor(item)[0];
}
