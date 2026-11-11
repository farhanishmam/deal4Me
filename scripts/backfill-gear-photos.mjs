import { gearPhotoFor, isSkiGear, SKI_GEAR_GALLERY, SKI_GEAR_PHOTO } from "../src/lib/gear-photos.ts";
import { createHash } from "node:crypto";

const base = process.argv.slice(2).find((argument) => !argument.startsWith("--")) ?? "http://localhost:3000";

async function state() {
  const response = await fetch(new URL("/api/data/state", base), { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not read the catalog (${response.status})`);
  return response.json();
}

const initial = await state();
let changed = 0;
for (const candidate of initial.items.filter(isSkiGear)) {
  if (candidate.photoUrl && candidate.photoUrl !== "/brand/no-photo.svg" && candidate.photoUrl !== SKI_GEAR_PHOTO) continue;
  if (candidate.photoUrl === SKI_GEAR_PHOTO && gearPhotoFor(candidate) === SKI_GEAR_PHOTO && candidate.photoUrls?.length >= 3) continue;
  // Re-read every record immediately before mutation so concurrent seller edits survive.
  const latest = (await state()).items.find((item) => item.id === candidate.id);
  if (!latest) continue;
  const expected = gearPhotoFor(latest);
  const legacyCover = !latest.photoUrl || latest.photoUrl === "/brand/no-photo.svg" || latest.photoUrl === SKI_GEAR_PHOTO;
  if (!legacyCover) continue;
  const gallery = expected === SKI_GEAR_PHOTO
    ? [...new Set([...SKI_GEAR_GALLERY, ...(latest.photoUrls ?? [])])]
    : [...new Set([expected, ...(latest.photoUrls ?? []).filter((url) => url !== SKI_GEAR_PHOTO)])];
  if (latest.photoUrl === expected && JSON.stringify(latest.photoUrls) === JSON.stringify(gallery)) continue;
  const response = await fetch(new URL("/api/data/items", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ item: { ...latest, photoUrl: expected, photoUrls: gallery } }),
  });
  if (!response.ok) throw new Error(`Could not save ${latest.name}: ${await response.text()}`);
  console.log(`${latest.name}: ${expected}`);
  changed++;
}
console.log(`Updated ${changed} gear listing photos; owner-uploaded photos preserved.`);

if (process.argv.includes("--distinct-covers")) {
  const extraCovers = [
    "/listings/ski/pexels-14846103.jpg",
    "/listings/ski/unsplash-aGe00J3SuEc.jpg",
    "/listings/ski/pexels-11169835.jpg",
    "/listings/ski/unsplash-4fMr2hAC78U.jpg",
    "/listings/ski/pexels-36350616.jpg",
    "/listings/ski/unsplash-3naP9D9JX1s.jpg",
  ];
  const hashCache = new Map();
  async function photoHash(photo) {
    if (!hashCache.has(photo)) {
      const response = await fetch(photo.startsWith("data:") ? photo : new URL(photo, base));
      if (!response.ok) throw new Error(`Could not read a listing photo (${response.status})`);
      hashCache.set(photo, createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"));
    }
    return hashCache.get(photo);
  }
  const used = new Set();
  let deduplicated = 0;
  for (const candidate of (await state()).items.filter(isSkiGear)) {
    const previousHash = await photoHash(candidate.photoUrl);
    if (!used.has(previousHash)) {
      used.add(previousHash);
      continue;
    }
    const latest = (await state()).items.find((item) => item.id === candidate.id);
    if (!latest) continue;
    const latestHash = await photoHash(latest.photoUrl);
    if (!used.has(latestHash)) {
      used.add(latestHash);
      continue;
    }
    let cover;
    for (const proposed of extraCovers) {
      if (!used.has(await photoHash(proposed))) {
        cover = proposed;
        break;
      }
    }
    if (!cover) throw new Error("More distinct source images are needed for additional duplicated uploads.");
    const response = await fetch(new URL("/api/data/items", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ item: {
        ...latest,
        photoUrl: cover,
        photoUrls: [...new Set([cover, latest.photoUrl, ...(latest.photoUrls ?? [])])].slice(0, 12),
      } }),
    });
    if (!response.ok) throw new Error(`Could not save ${latest.name}: ${await response.text()}`);
    used.add(await photoHash(cover));
    console.log(`${latest.name} (${latest.id}): distinct cover ${cover}; original retained in gallery`);
    deduplicated++;
  }
  console.log(`Replaced ${deduplicated} repeated covers; ${used.size} unique gear cover image hashes.`);
}
