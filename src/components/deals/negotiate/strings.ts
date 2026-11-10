import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

/** Copy for the negotiate screen. English and Japanese; other languages use English. */
const en = {
  title: "Your rental deal",
  titleSale: "Your purchase deal",
  badge: "Haiku",
  days: "{n} days",
  day: "1 day",
  maxLabel: "Your price / day",
  saleLabel: "Your price",
  private: "Your agent offers exactly this",
  agent: "Agent",
  manual: "Manual",
  ownerAgent: "{name}'s agent",
  sellerAgent: "Seller's agent",
  yourAgent: "Your agent",
  you: "You",
  perDay: "{price} / day",
  earlier: "Earlier rounds",
  calm: "Your agent offers this price and argues for it.",
  manualCalm: "Make your offer below.",
  round: "Round {n} of {m}",
  start: "Start negotiating",
  negotiating: "Negotiating…",
  dealAgreed: "Deal agreed",
  fee: "{fee} rental fee",
  saleFee: "{fee} to buy",
  breakdown: "{days} days × {price}",
  breakdownOne: "{days} day × {price}",
  save: "Save {amount}",
  deposit: "{deposit} deposit · held, not charged",
  review: "Review booking",
  requestAtPrice: "Request at {price}",
  messageSeller: "Message the seller",
  startNew: "New negotiation",
  saved: "Saved negotiation",
  unfinished: "This negotiation didn't finish.",
  missing: "That negotiation isn't saved here.",
  noDeal: "No deal at this price. Raising it could help.",
  thinking: "Thinking…",
  raise: "Raise my price",
  offer: "Your offer per day",
  offerSale: "Your offer",
  send: "Send",
  openManual: "Could we agree on this?",
  counterManual: "How about this?",
  error: "Something went wrong. Try again.",
  errorHint: "Your price is kept. Try again.",
  notFound: "Gear not found",
  back: "Back home",
} as const;

export type Key = keyof typeof en;

const ja: Record<Key, string> = {
  title: "レンタルの交渉",
  titleSale: "購入の交渉",
  badge: "Haiku",
  days: "{n}日間",
  day: "1日",
  maxLabel: "希望価格 / 日",
  saleLabel: "希望価格",
  private: "エージェントがこの金額で提案します",
  agent: "エージェント",
  manual: "手動",
  ownerAgent: "{name}のエージェント",
  sellerAgent: "出品者のエージェント",
  yourAgent: "あなたのエージェント",
  you: "あなた",
  perDay: "{price} / 日",
  earlier: "以前のやり取り",
  calm: "エージェントがこの金額で交渉します。",
  manualCalm: "下から金額を送ってください。",
  round: "ラウンド {n}/{m}",
  start: "交渉を始める",
  negotiating: "交渉中…",
  dealAgreed: "成立",
  fee: "レンタル料 {fee}",
  saleFee: "購入価格 {fee}",
  breakdown: "{days}日 × {price}",
  breakdownOne: "{days}日 × {price}",
  save: "{amount}お得",
  deposit: "保証金 {deposit} · 保留のみ、請求なし",
  review: "予約を確認",
  requestAtPrice: "{price}でリクエスト",
  messageSeller: "出品者にメッセージ",
  startNew: "新しい交渉",
  saved: "保存された交渉",
  unfinished: "この交渉は完了しませんでした。",
  missing: "その交渉は保存されていません。",
  noDeal: "この金額では不成立でした。上げると成立するかもしれません。",
  thinking: "考え中…",
  raise: "金額を上げる",
  offer: "1日あたりの金額",
  offerSale: "ご提案金額",
  send: "送信",
  openManual: "この金額でいかがですか？",
  counterManual: "これでどうでしょう？",
  error: "うまくいきませんでした。もう一度お試しください。",
  errorHint: "金額は保持されています。もう一度お試しください。",
  notFound: "ギアが見つかりません",
  back: "ホームへ戻る",
};

const dictionaries: Partial<Record<Lang, Record<Key, string>>> = { ja };

export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let text: string = dictionaries[lang]?.[key] ?? en[key];
  if (vars) for (const k of Object.keys(vars)) text = text.replaceAll(`{${k}}`, String(vars[k]));
  return text;
}

export function useT() {
  const lang = useStore((s) => s.visitor.language);
  return { lang, t: (key: Key, vars?: Record<string, string | number>) => t(lang, key, vars) };
}
