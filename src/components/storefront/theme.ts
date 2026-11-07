import type { CSSProperties } from "react";
import type { StorefrontTheme } from "@/lib/types";

type RGB = [number, number, number];

function parse(input: string | undefined): RGB | null {
  if (!input) return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(c: RGB): string {
  return `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

function lum(c: RGB): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
}

/** `t` is the share of `b` in the result, 0 to 1. */
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Light text when it reads well enough on `bg`, otherwise the dark option. */
function readable(bg: RGB, light: RGB, dark: RGB, minLight = 4): RGB {
  if (contrast(bg, light) >= minLight) return light;
  return contrast(bg, dark) >= contrast(bg, light) ? dark : light;
}

const WHITE: RGB = [255, 255, 255];
const RADIUS: Record<StorefrontTheme["radius"], number> = { sm: 8, md: 14, lg: 22 };

/**
 * Scoped CSS variables for one storefront. Everything inside the storefront is
 * styled from these, so changing the theme never touches the rest of the app.
 */
export function themeVars(theme: StorefrontTheme): CSSProperties {
  const bg = parse(theme.background) ?? [255, 255, 255];
  const surface = parse(theme.surface) ?? bg;
  const text = parse(theme.text) ?? [20, 20, 20];
  const primary = parse(theme.primary) ?? [29, 59, 83];
  const accent = parse(theme.accent) ?? primary;

  const dark = lum(bg) < 0.25;
  const ink = dark ? bg : text; // the dark option for text on a light fill

  const onPrimary = readable(primary, WHITE, ink);
  const onAccent = readable(accent, WHITE, ink, 7);

  let panel: RGB;
  switch (theme.preset) {
    case "ski_lodge":
      panel = mix(primary, [18, 10, 4], 0.42);
      break;
    case "food_truck":
      panel = primary;
      break;
    case "night_market":
      panel = surface;
      break;
    default:
      panel = mix(primary, [6, 12, 18], 0.1);
  }
  const onPanel = theme.preset === "night_market" ? text : readable(panel, theme.preset === "ski_lodge" ? bg : WHITE, ink, 3.2);

  const ok: RGB = theme.preset === "night_market" ? accent : dark ? [88, 226, 160] : [27, 122, 70];
  const okBg = mix(surface, ok, dark ? 0.16 : 0.12);

  const px = (n: number) => `${n}px`;
  const r = RADIUS[theme.radius] ?? RADIUS.md;

  const font = theme.font;
  const heading =
    font === "serif"
      ? "var(--sf-font-serif), Georgia, serif"
      : font === "rounded"
        ? "var(--sf-font-round), var(--font-public-sans), system-ui, sans-serif"
        : "var(--font-public-sans), system-ui, sans-serif";
  const body =
    font === "rounded"
      ? "var(--sf-font-round), var(--font-public-sans), system-ui, sans-serif"
      : "var(--font-public-sans), system-ui, sans-serif";

  const vars: Record<string, string> = {
    "--sf-primary": theme.primary,
    "--sf-bg": theme.background,
    "--sf-surface": theme.surface,
    "--sf-text": theme.text,
    "--sf-accent": theme.accent,
    "--sf-radius": px(r),
    "--sf-font": heading,
    "--sf-body": body,
    // derived
    "--sf-on-primary": hex(onPrimary),
    "--sf-on-accent": hex(onAccent),
    "--sf-panel": hex(panel),
    "--sf-on-panel": hex(onPanel),
    "--sf-panel-muted": `color-mix(in srgb, ${hex(onPanel)} 68%, ${hex(panel)})`,
    "--sf-muted": hex(mix(bg, text, 0.62)),
    "--sf-line": hex(mix(bg, text, dark ? 0.16 : 0.13)),
    "--sf-soft": hex(mix(surface, primary, dark ? 0.2 : 0.1)),
    "--sf-art": hex(mix(bg, text, dark ? 0.1 : 0.05)),
    "--sf-ok": hex(ok),
    "--sf-ok-bg": hex(okBg),
  };
  return vars as CSSProperties;
}

/** Two letters for the shop avatar: "Canyon Taco Co." -> "CT". */
export function initials(name: string): string {
  const words = name
    .replace(/['’]s\b/g, "")
    .split(/\s+/)
    .filter((w) => w && !/^(the|co\.?|and|&)$/i.test(w));
  const letters = (words.length ? words : [name]).slice(0, 2).map((w) => w[0] ?? "");
  return letters.join("").toUpperCase();
}
