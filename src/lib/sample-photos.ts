import type { Item } from "./types";

export interface SamplePhoto {
  id: string;
  label: string;
  /** A path under public/. Saved on the item as is, never as a data URL. */
  url: string;
  /** Tested against the item's name (strong) and category (weak). */
  match: RegExp;
}

/** Stock pictures a seller can pick for an item. Add more as plain entries. */
export const SAMPLE_PHOTOS: SamplePhoto[] = [
  // The lookbehind keeps a plain "Burrito" away from the breakfast one.
  { id: "burrito", label: "Burrito", url: "/demo/items/ct-burrito.svg", match: /(?<!breakfast )burritos?\b/i },
  { id: "breakfast-burrito", label: "Breakfast burrito", url: "/demo/items/sc-breakfast-burrito.svg", match: /breakfast|burritos?\b/i },
  { id: "taco-plate", label: "Taco plate", url: "/demo/items/ct-taco-plate.svg", match: /tacos?\b/i },
  { id: "tacos", label: "Tacos", url: "/demo/photos/find-food.jpg", match: /tacos?\b/i },
  { id: "carne-asada", label: "Carne asada", url: "/demo/items/ct-carne-asada.svg", match: /carne|asada|steak|beef|tacos?\b/i },
  { id: "al-pastor", label: "Al pastor", url: "/demo/items/ct-al-pastor.svg", match: /pastor|pork|tacos?\b/i },
  { id: "baja-fish", label: "Baja fish", url: "/demo/items/ct-baja-fish.svg", match: /baja|fish|tacos?\b/i },
  { id: "nachos", label: "Nachos", url: "/demo/items/ct-nachos.svg", match: /nachos?|chips/i },
  { id: "horchata", label: "Horchata", url: "/demo/items/ct-horchata.svg", match: /horchata|drinks?|beverages?/i },
  { id: "jamaica", label: "Jamaica", url: "/demo/items/ct-jamaica.svg", match: /jamaica|hibiscus|agua|drinks?|beverages?/i },
  { id: "latte", label: "Latte", url: "/demo/items/sc-latte.svg", match: /latte|coffee|espresso|cappuccino/i },
  { id: "cold-brew", label: "Cold brew", url: "/demo/items/sc-cold-brew.svg", match: /cold brew|iced|coffee/i },
  { id: "mocha", label: "Mocha", url: "/demo/items/sc-mocha.svg", match: /mocha|cocoa|coffee/i },
  { id: "croissant", label: "Croissant", url: "/demo/items/sc-croissant.svg", match: /croissant|pastr(?:y|ies)|bakery/i },
  { id: "cinnamon-roll", label: "Cinnamon roll", url: "/demo/items/sc-cinnamon-roll.svg", match: /cinnamon|rolls?\b|pastr(?:y|ies)|bakery/i },
  { id: "avocado-toast", label: "Avocado toast", url: "/demo/items/sc-avocado-toast.svg", match: /avocado|toast/i },
  { id: "granola", label: "Granola bowl", url: "/demo/items/sc-granola.svg", match: /granola|yogurt|parfait|bowl/i },
  { id: "skis", label: "Skis", url: "/demo/photos/skis.jpg", match: /skis?\b|skiing/i },
  { id: "ski-pair", label: "Ski pair", url: "/demo/items/mg-skis.svg", match: /skis?\b|skiing/i },
  { id: "ski-gear", label: "Ski gear", url: "/demo/photos/rent-gear.jpg", match: /gear|packages?|sets?\b|rentals?/i },
  { id: "boots", label: "Boots", url: "/demo/items/mg-boots.svg", match: /boots?/i },
  { id: "jacket", label: "Jacket", url: "/demo/items/mg-jacket.svg", match: /jackets?|coats?/i },
  { id: "snowshoes", label: "Snowshoes", url: "/demo/items/mg-snowshoes.svg", match: /snowshoes?/i },
  { id: "goggles", label: "Goggles", url: "/demo/items/tc-goggles.svg", match: /goggles?/i },
  { id: "snowboard", label: "Snowboard", url: "/demo/items/tc-snowboard.svg", match: /snowboards?/i },
];

/** Samples that match the item's name or category first, the rest in list order. */
export function orderSamples(item: Pick<Item, "name" | "category">): SamplePhoto[] {
  const score = (sample: SamplePhoto) => (sample.match.test(item.name) ? 2 : 0) + (sample.match.test(item.category) ? 1 : 0);
  return SAMPLE_PHOTOS.map((sample, index) => ({ sample, index, score: score(sample) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ sample }) => sample);
}
