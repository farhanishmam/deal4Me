import type { StorefrontTheme } from "./types";

export const THEMES: Record<StorefrontTheme["preset"], StorefrontTheme> = {
  // Warm wood, cream paper, serif type.
  ski_lodge: {
    preset: "ski_lodge",
    primary: "#7a4a2b",
    background: "#f4ece0",
    surface: "#fbf6ee",
    text: "#2c1f16",
    accent: "#b5833a",
    font: "serif",
    radius: "md",
  },
  // Bold tomato red on sunny yellow, rounded and loud.
  food_truck: {
    preset: "food_truck",
    primary: "#e23a1d",
    background: "#fff4cf",
    surface: "#ffffff",
    text: "#1d1208",
    accent: "#ffb400",
    font: "rounded",
    radius: "lg",
  },
  // White, airy, one cool blue.
  alpine_minimal: {
    preset: "alpine_minimal",
    primary: "#1d3b53",
    background: "#ffffff",
    surface: "#f5f7f9",
    text: "#0f1a24",
    accent: "#6fa3c7",
    font: "sans",
    radius: "sm",
  },
  // Near black with neon pink and mint.
  night_market: {
    preset: "night_market",
    primary: "#ff3d9a",
    background: "#0c0a14",
    surface: "#171325",
    text: "#f4f0ff",
    accent: "#2ff0d2",
    font: "sans",
    radius: "md",
  },
};

export const THEME_LABELS: Record<StorefrontTheme["preset"], string> = {
  ski_lodge: "Ski Lodge",
  food_truck: "Food Truck",
  alpine_minimal: "Alpine Minimal",
  night_market: "Night Market",
};

