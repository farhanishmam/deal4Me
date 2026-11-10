import type { Api, Progress } from "@/lib/api-contract";
import { logStep, postJson } from "@/lib/real/http";
import { importExtractedShop, suggestItemPrice, type ExtractedItem } from "@/lib/real/onboarding-records";
import { voiceDemoForDescription } from "@/lib/voice-demo";
import { PHOTOS } from "@/lib/photos";

type DescribeOut = {
  shopName: string;
  tagline: string;
  items: ExtractedItem[];
  ms: number;
  costUsd: number;
  cached?: boolean;
};

async function importFromDescription(text: string, cb?: Progress) {
  cb?.onStep?.("Listening to your description");
  cb?.onStep?.("Finding your items");
  const out = await postJson<DescribeOut>("/api/ai/describe", { text });
  const demo = voiceDemoForDescription(text);
  const items = out.items.map((item) => {
    if (demo?.id === "ski" && item.kind === "rental") {
      return { ...item, photoUrl: /boot|set|package/i.test(item.name) ? PHOTOS.rentGear : PHOTOS.skis };
    }
    if (demo?.id === "taco" && /tacos?/i.test(item.name)) return { ...item, photoUrl: PHOTOS.findFood };
    return item;
  });
  cb?.onStep?.("Pricing with the deals agent");
  const shop = await importExtractedShop({ name: out.shopName, tagline: out.tagline, items }, cb);
  logStep("Onboarding agent", "Built a shop from a description", `${shop.name}, ${out.items.length} items${out.cached ? " · saved extraction" : ""}`, out.ms, out.costUsd);
  return shop;
}

export const realDescribe = {
  importFromDescription,
  suggestPrice: suggestItemPrice,
} satisfies Pick<Api, "importFromDescription" | "suggestPrice">;
