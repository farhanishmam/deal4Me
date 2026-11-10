import { Instrument_Serif, Inter } from "next/font/google";

export const rpSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--rp-font-serif",
});

export const rpSans = Inter({
  subsets: ["latin"],
  variable: "--rp-font-sans",
});

export const rpFontVars = `${rpSerif.variable} ${rpSans.variable}`;
