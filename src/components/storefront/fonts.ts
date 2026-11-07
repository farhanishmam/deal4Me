import { Fraunces, Fredoka } from "next/font/google";

// Loaded here, not in the root layout, so the storefront stays self-contained.
// The variable classes go on the storefront wrapper.
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--sf-font-serif",
  display: "swap",
});

export const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--sf-font-round",
  display: "swap",
});

export const storefrontFontClass = `${fraunces.variable} ${fredoka.variable}`;
