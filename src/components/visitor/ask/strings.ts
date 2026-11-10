import type { Lang } from "@/lib/types";

/** Copy for the Ask screen. English and Japanese; every other language reads English. */
const en = {
  hi: "Hi, {name}",
  hiThere: "Hi there",
  headline: "What can we find for you?",
  sample: "Ski gear for 3 days, under $250",
  food: "Tacos and coffee nearby",
  placeholder: "Search gear, food and shops",
  listening: "Listening…",
  mic: "Speak your request",
  stopMic: "Finish voice input",
  recording: "Speak, then tap the mic to finish.",
  processing: "Finishing your transcript…",
  review: "Review your words, then find it.",
  voiceFailed: "Voice input is unavailable. Type your request to continue.",
  cta: "Find it for me",
  approve: "You approve every booking.",
  rent: "Rent gear",
  eat: "Find food",
  around: "Around Sugar House",
  nearby: "Explore nearby",
  perDay: "{price} / day",
  deposit: "{deposit} deposit · held, not charged",
  language: "Language",
};

const ja: typeof en = {
  hi: "{name}さん、こんにちは",
  hiThere: "こんにちは",
  headline: "何をお探しですか？",
  sample: "スキー用品を3日間、予算250ドルで",
  food: "近くでタコスとコーヒー",
  placeholder: "用品・食事・お店を検索",
  listening: "聞いています…",
  mic: "音声で入力",
  stopMic: "音声入力を終了",
  recording: "話し終えたらマイクを押してください。",
  processing: "文字起こしを仕上げています…",
  review: "内容を確認してから検索してください。",
  voiceFailed: "音声入力を利用できません。ご希望を入力してください。",
  cta: "探してもらう",
  approve: "予約はすべて、あなたが承認します。",
  rent: "レンタル",
  eat: "食事を探す",
  around: "シュガーハウス周辺",
  nearby: "近くを見る",
  perDay: "{price} / 日",
  deposit: "保証金{deposit} · 保留、請求なし",
  language: "言語",
};

export type AskKey = keyof typeof en;

export function askText(lang: Lang, key: AskKey, vars?: Record<string, string | number>): string {
  let text = (lang === "ja" ? ja : en)[key];
  if (vars) {
    for (const name of Object.keys(vars)) text = text.replaceAll(`{${name}}`, String(vars[name]));
  }
  return text;
}
