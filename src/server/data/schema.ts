import { z } from "zod";
import { withGearPhoto } from "@/lib/gear-photos";

const cents = z.number().int().nonnegative().max(100_000_000);
const id = z.string().trim().min(1).max(180);
const text = z.string().max(12000);
const photo = z.string().max(12_000_000);
const lang = z.enum(["en", "ja", "es", "fr", "de", "ko", "zh"]);

export const ItemSchema = z.object({
  id, shopId: id, kind: z.enum(["food", "rental", "sale"]),
  name: z.string().trim().min(1).max(300), description: text, category: z.string().max(300),
  photoUrl: photo, photoUrls: z.array(photo).max(12).optional(),
  condition: z.enum(["new", "like_new", "good", "used"]).optional(),
  priceCents: cents.optional(),
  rental: z.object({
    dailyFeeCents: cents, minDailyFeeCents: cents, depositCents: cents,
    maxDays: z.number().int().min(1).max(365), bindingCheckRequired: z.boolean(),
  }).refine((r) => r.minDailyFeeCents <= r.dailyFeeCents, "Minimum cannot exceed asking price").optional(),
  suggestion: z.object({
    amountCents: cents, rangeCents: z.tuple([cents, cents]), depositCents: cents.optional(), reasoning: text,
  }).optional(),
  tags: z.array(z.string().max(200)).max(50).optional(), available: z.boolean(),
  availableFrom: z.string().datetime({ offset: true }).optional(),
  availableUntil: z.string().datetime({ offset: true }).optional(),
  sizes: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
}).refine((i) => i.kind !== "rental" || !!i.rental, "Rental terms are required")
  .refine((i) => i.kind === "rental" || i.priceCents !== undefined, "A price is required")
  .refine((i) => !i.availableFrom || !i.availableUntil || Date.parse(i.availableUntil) > Date.parse(i.availableFrom), "Availability must end after it starts")
  .transform(withGearPhoto);

export const ShopSchema = z.object({
  id, slug: id, sellerKind: z.enum(["business", "local"]), name: z.string().trim().min(1).max(300),
  ownerFirstName: z.string().max(100), neighborhood: z.string().max(200),
  rating: z.number().min(0).max(5), distanceKm: z.number().nonnegative(),
  storefront: z.object({
    shopId: id, slug: id, name: z.string().trim().min(1).max(300), tagline: text,
    bannerText: text.optional(), heroPhotoUrl: photo.optional(),
    theme: z.object({
      preset: z.enum(["ski_lodge", "food_truck", "alpine_minimal", "night_market"]),
      primary: z.string().max(100), background: z.string().max(100), surface: z.string().max(100),
      text: z.string().max(100), accent: z.string().max(100), font: z.enum(["sans", "serif", "rounded"]), radius: z.enum(["sm", "md", "lg"]),
    }),
    sections: z.array(z.object({ id, title: z.string().max(300), itemIds: z.array(id).max(1000) })).max(100),
    languages: z.array(lang).min(1).max(7),
    badges: z.object({ agentReady: z.boolean(), permitVerified: z.boolean().optional(), bindingPartner: z.string().max(300).optional() }),
    promo: z.object({ text, percentOff: z.number().min(0).max(100), tag: z.string().max(200).optional() }).optional(),
  }),
  liveAt: z.string().datetime().optional(), onboardingSeconds: z.number().nonnegative().optional(),
}).refine((s) => s.id === s.storefront.shopId && s.slug === s.storefront.slug, "Shop identifiers must match");

export const OrderSchema = z.object({
  id, shopId: id, lines: z.array(z.object({ itemId: id, qty: z.number().int().min(1).max(100) })).min(1).max(100),
  totalCents: cents, pickupTime: z.string().datetime(), pickupCode: z.string().max(100),
  status: z.enum(["placed", "accepted", "ready", "picked_up"]),
});

export const PhotosSchema = z.array(photo.refine((p) => /^data:image\/(jpeg|png|webp|gif);base64,/i.test(p), "Upload a JPEG, PNG, WebP or GIF photo")).min(1).max(6);
export const DamageCheckSchema = z.object({ result: z.enum(["clear", "review"]), note: text });
export const RentalSchema = z.object({
  id, itemId: id, shopId: id, negotiationId: id.optional(), days: z.number().int().min(1).max(365),
  dailyFeeCents: cents, depositCents: cents, holdCents: cents, capturedCents: cents.optional(), releasedCents: cents.optional(),
  status: z.enum(["reserved", "picked_up", "returned", "settled"]), pickupCode: z.string(),
  pickupAt: z.string().datetime(), returnBy: z.string().datetime(),
  pickupPhotos: z.array(photo), returnPhotos: z.array(photo), damageCheck: DamageCheckSchema.optional(),
});

export const ItemRequestSchema = z.object({
  id, itemId: id, shopId: id, kind: z.enum(["rental", "sale"]),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  size: z.string().trim().min(1).max(80).optional(),
  negotiationId: id.optional(), agreedPriceCents: cents.optional(),
  status: z.enum(["requested", "confirmed"]), createdAt: z.string().datetime(),
});

export const DataStateSchema = z.object({
  shops: z.array(ShopSchema), items: z.array(ItemSchema), orders: z.array(OrderSchema), rentals: z.array(RentalSchema),
  itemRequests: z.array(ItemRequestSchema).default([]),
});
