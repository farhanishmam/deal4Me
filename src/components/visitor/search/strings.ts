import type { Lang } from "@/lib/types";

/** Copy for the buyer's search screen. English and Japanese; every other language reads English. */
const en = {
  title: "Search",
  placeholder: "Search gear, food and shops",
  clear: "Clear search",
  loading: "Loading…",
  thinking: "Finding the best matches…",
  count: "{n} results",
  countOne: "1 result",
  perDay: "{price} / day",
  deposit: "{deposit} deposit · held, not charged",
  none: "Nothing matches “{q}”.",
  noneListed: "Nothing is listed yet.",
  ask: "Ask the AI",
};

const ja: typeof en = {
  title: "検索",
  placeholder: "用品・食事・お店を検索",
  clear: "検索をクリア",
  loading: "読み込み中…",
  thinking: "ぴったりのものを探しています…",
  count: "{n}件",
  countOne: "1件",
  perDay: "{price} / 日",
  deposit: "保証金{deposit} · 保留、請求なし",
  none: "「{q}」に一致するものはありません。",
  noneListed: "まだ出品がありません。",
  ask: "AIに聞く",
};

export type SearchKey = keyof typeof en;

export function searchText(lang: Lang, key: SearchKey, vars?: Record<string, string | number>): string {
  let text = (lang === "ja" ? ja : en)[key];
  if (vars) {
    for (const name of Object.keys(vars)) text = text.replaceAll(`{${name}}`, String(vars[name]));
  }
  return text;
}
