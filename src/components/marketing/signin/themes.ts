// The three sign-in themes, as data. The colors that restyle the screen live in
// signin-theme.css (keyed by data-theme); the swatches here only feed the picker chips.

export type ThemeId = "pine" | "sky" | "golden";

export interface SignInTheme {
  id: ThemeId;
  name: string;
  /** Headline, one entry per line. */
  headline: readonly string[];
  /** Small tracked line under the headline, with a thin rule beside it. */
  eyebrow?: string;
  /** One short line under the headline on the desktop panel. */
  tagline?: string;
  /** Background, light, main, deep: the four chips of the reference swatch row. */
  swatches: readonly [string, string, string, string];
  /** Scene photo in /public. Its framing per theme is in signin-theme.css. */
  scene: string;
}

export const THEME_STORAGE_KEY = "ms2034-signin-theme";
export const DEFAULT_THEME: ThemeId = "pine";

export const THEMES: readonly SignInTheme[] = [
  {
    id: "pine",
    name: "Park & Pine",
    headline: ["Keep it local."],
    tagline: "Salt Lake's shops, one tap away.",
    swatches: ["#FBF7EF", "#9BBD8C", "#4F8A55", "#0F4A2B"],
    scene: "/demo/scenes/lawn-mountains.jpg",
  },
  {
    id: "sky",
    name: "Sky & City",
    headline: ["Find your next", "favorite."],
    tagline: "Shops, food and makers, mapped for you.",
    swatches: ["#EEF4FB", "#86BBEB", "#2F7BC4", "#0A3D78"],
    scene: "/demo/scenes/wasatch-peak.jpg",
  },
  {
    id: "golden",
    name: "Golden Local",
    headline: ["Made here.", "Loved here."],
    eyebrow: "THE NEIGHBORHOOD EDIT",
    swatches: ["#FBF1E3", "#E3A958", "#BF5423", "#5A2D16"],
    scene: "/demo/scenes/foothills-campus.jpg",
  },
];

export const THEME_BY_ID: Record<ThemeId, SignInTheme> = {
  pine: THEMES[0],
  sky: THEMES[1],
  golden: THEMES[2],
};

export function isThemeId(value: unknown): value is ThemeId {
  return value === "pine" || value === "sky" || value === "golden";
}
