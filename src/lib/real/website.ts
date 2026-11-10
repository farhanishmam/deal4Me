import type { Api, Progress } from "@/lib/api-contract";
import { logStep, postJson, postNdjson } from "@/lib/real/http";
import { importExtractedShop, type ExtractedItem } from "@/lib/real/onboarding-records";
import type { Shop, StorefrontTheme } from "@/lib/types";

interface RestyleResult {
  theme: StorefrontTheme;
  name: string;
  tagline: string;
  bannerText: string;
  heroPhotoUrl?: string;
  items?: ExtractedItem[];
}

type Line = { type: "step"; label: string } | { type: "result"; result: RestyleResult } | { type: "error"; error: string };

async function importFromWebsite(input: { url?: string; text?: string }, cb?: Progress): Promise<Shop> {
  const started = Date.now();
  const url = input.url?.trim();
  const text = input.text?.trim();
  if (!url && !text) throw new Error("Enter a website or paste your menu.");

  let draft: Parameters<typeof importExtractedShop>[0];
  if (url) {
    let result: RestyleResult | undefined;
    const address = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    await postNdjson<Line>("/api/ai/restyle", { url: address }, (line) => {
      if (line.type === "step") {
        cb?.onStep?.(["Matching colors and fonts", "Rebuilding your storefront", "Building your storefront", "Using saved website"].includes(line.label) ? "Finding menu items" : line.label);
      } else if (line.type === "result") result = line.result;
      else throw new Error(line.error);
    });
    if (!result) throw new Error("The website did not return a storefront. Try again.");
    draft = { ...result, items: result.items ?? [] };
  } else {
    cb?.onStep?.("Finding menu items");
    const result = await postJson<{ shopName: string; tagline: string; items: ExtractedItem[] }>("/api/ai/describe", { text });
    draft = { name: result.shopName, tagline: result.tagline, items: result.items };
  }

  if (draft.items.some((item) => item.priceUsd === null)) cb?.onStep?.("Pricing with the deals agent");
  const shop = await importExtractedShop(draft, cb);
  logStep("Onboarding agent", "Imported a website or menu", `${shop.name}, ${draft.items.length} items`, Date.now() - started);
  return shop;
}

export const realWebsite = { importFromWebsite } satisfies Pick<Api, "importFromWebsite">;
