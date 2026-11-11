import type { Condition, SellerKind } from "@/lib/types";

type DemoPrice = { amount: number; low: number; high: number };

/** Only these exact JPEG bytes have prepared appraisals. Other photos use AI. */
export interface DemoPhoto {
  src: string;
  sha256: string;
  name: string;
  category: string;
  condition: Condition;
  prices: Partial<Record<"sale" | "rental" | "food", DemoPrice>>;
}

export const DEMO_GEAR_PHOTOS: DemoPhoto[] = [
  {
    src: "/demo/photos/skis.jpg",
    sha256: "e81262913f20d0005b557d36dd7fae3d12e3a9d6ddc3b758cc87a67da8f7ca65",
    name: "Black skis",
    category: "Ski gear",
    condition: "used",
    prices: { rental: { amount: 35, low: 25, high: 50 }, sale: { amount: 180, low: 150, high: 200 } },
  },
  {
    src: "/demo/photos/rent-gear.jpg",
    sha256: "5a00dcc47f87b03f2edbaa0870b1948d2c3be0aa1339294bec60092f120bed85",
    name: "Ski and boot set",
    category: "Ski gear",
    condition: "good",
    prices: { rental: { amount: 45, low: 30, high: 65 }, sale: { amount: 220, low: 190, high: 250 } },
  },
];

export const DEMO_FOOD_PHOTOS: DemoPhoto[] = [
  {
    src: "/demo/photos/find-food.jpg",
    sha256: "a876fb3029698c82a3751977ce5e1ba0c16fc1c6e9dde185bd19bc369d8471bc",
    name: "Steak taco plate",
    category: "Tacos",
    condition: "new",
    prices: { food: { amount: 12, low: 9, high: 16 } },
  },
];

export const demoPhotosFor = (kind: SellerKind) => kind === "business" ? DEMO_FOOD_PHOTOS : DEMO_GEAR_PHOTOS;

export const DEMO_PHOTO_SETS: { label: string; kind: SellerKind; photos: DemoPhoto[] }[] = [
  { label: "Try ski photos", kind: "local", photos: DEMO_GEAR_PHOTOS },
  { label: "Try taco photos", kind: "business", photos: DEMO_FOOD_PHOTOS },
];
