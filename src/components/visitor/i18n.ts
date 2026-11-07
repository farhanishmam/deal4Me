import { APP_TIME_ZONE } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

/**
 * Visitor copy. English and Japanese are complete. Every other language falls
 * back to English key by key, so a missing string never shows a blank.
 */
const en = {
  "welcome.headline": "Welcome to\nSalt Lake",
  "welcome.language": "Choose your language",
  "common.continue": "Continue",
  "common.back": "Back",

  "trip.title": "Plan your trip",
  "trip.arrive": "Arrive",
  "trip.leave": "Leave",
  "trip.days": "{n} days",
  "trip.day": "1 day",
  "trip.interests": "Interests",
  "trip.budget": "Budget",
  "trip.cta": "Plan my trip",
  "interest.ski": "Ski",
  "interest.food": "Food",
  "interest.explore": "Explore",

  "home.greeting": "Hi, {name}",
  "home.search": "Search gear and food",
  "home.clear": "Clear search",
  "home.gear": "Gear from locals",
  "home.eat": "Eat local",
  "home.perDay": "{price}/day",
  "home.depositHeld": "{deposit} deposit held",
  "home.km": "{n} km",
  "home.agentTitle": "Ask your agent",
  "home.agentBody": "Tell it what you need. It finds, bargains and pays.",
  "home.emptyTitle": "Nothing for “{q}”",
  "home.emptyBody": "Try another word, or ask your agent.",

  "mountain.title": "Today on the mountain",
  "mountain.sample": "Sample data",
  "mountain.snow": "Snow depth",
  "mountain.temp": "Temperature",
  "mountain.snowValue": "58 in",
  "mountain.tempValue": "21\u00b0F",
} as const;

export type Key = keyof typeof en;
type Dict = Partial<Record<Key, string>>;

const ja: Record<Key, string> = {
  "welcome.headline": "ようこそ、\nソルトレイクへ",
  "welcome.language": "言語を選んでください",
  "common.continue": "次へ",
  "common.back": "戻る",

  "trip.title": "旅の計画",
  "trip.arrive": "到着",
  "trip.leave": "出発",
  "trip.days": "{n}日間",
  "trip.day": "1日間",
  "trip.interests": "興味",
  "trip.budget": "予算",
  "trip.cta": "旅を計画する",
  "interest.ski": "スキー",
  "interest.food": "グルメ",
  "interest.explore": "散策",

  "home.greeting": "{name}さん、こんにちは",
  "home.search": "ギアやお店を探す",
  "home.clear": "検索をクリア",
  "home.gear": "地元のギア",
  "home.eat": "地元のグルメ",
  "home.perDay": "{price}/日",
  "home.depositHeld": "保証金{deposit}を保留",
  "home.km": "{n} km",
  "home.agentTitle": "エージェントに相談",
  "home.agentBody": "必要なものを伝えるだけ。探して、交渉して、支払います。",
  "home.emptyTitle": "「{q}」は見つかりません",
  "home.emptyBody": "別の言葉で探すか、エージェントに聞いてみましょう。",

  "mountain.title": "今日の山",
  "mountain.sample": "サンプルデータ",
  "mountain.snow": "積雪",
  "mountain.temp": "気温",
  "mountain.snowValue": "147 cm",
  "mountain.tempValue": "-6\u00b0C",
};

const dictionaries: Partial<Record<Lang, Dict>> = { en, ja };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let text = dictionaries[lang]?.[key] ?? en[key];
  if (vars) {
    for (const name of Object.keys(vars)) {
      text = text.replaceAll(`{${name}}`, String(vars[name]));
    }
  }
  return text;
}

/** Each language in its own words, in the order the welcome screen lists them. */
export const LANGUAGES: { code: Lang; name: string; short: string }[] = [
  { code: "en", name: "English", short: "EN" },
  { code: "ja", name: "日本語", short: "JA" },
  { code: "es", name: "Español", short: "ES" },
  { code: "fr", name: "Français", short: "FR" },
  { code: "de", name: "Deutsch", short: "DE" },
  { code: "ko", name: "한국어", short: "KO" },
  { code: "zh", name: "中文", short: "ZH" },
];

const LOCALES: Record<Lang, string> = {
  en: "en-US",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ko: "ko-KR",
  zh: "zh-CN",
};

const dayFormats = new Map<Lang, Intl.DateTimeFormat>();

/** "Nov 7 – 11". Dates always read in Salt Lake City time. */
export function formatRange(lang: Lang, startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  let fmt = dayFormats.get(lang);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(LOCALES[lang], {
      timeZone: APP_TIME_ZONE,
      month: "short",
      day: "numeric",
    });
    dayFormats.set(lang, fmt);
  }
  // Two plain dates joined by hand: formatRange spacing differs between Node and browsers.
  return `${fmt.format(start)} \u2013 ${fmt.format(end)}`;
}

/** The visitor's language and a bound translate function. */
export function useT() {
  const lang = useStore((s) => s.visitor.language);
  return {
    lang,
    t: (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars),
  };
}
