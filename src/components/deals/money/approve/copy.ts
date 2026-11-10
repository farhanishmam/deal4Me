import type { Lang } from "@/lib/types";

const en = {
  title: "Review & approve",
  rentalDays: "{n}-day rental",
  cardHold: "Your card hold",
  held: "Held, not charged",
  fee: "Rental fee · {n} × {price}",
  deposit: "Refundable deposit",
  after: "After a clear return: {fee} charged, {deposit} released.",
  step1: "Authorize {hold}",
  step2: "Pick up & enjoy",
  step3: "Return · Pay {fee}",
  binding: "Binding check at a partner shop",
  card: "Test card •••• 4242",
  cta: "Authorize {hold} hold",
  authorizing: "Authorizing…",
  simulated: "Simulated payment",
  failed: "The hold didn't go through. Nothing was charged.",
  messageSeller: "Message the seller",
  emptyTitle: "This item can't be rented",
  emptyBody: "Pick something else from Home.",
  emptyBack: "Back to Home",
};

type Dict = typeof en;

const ja: Dict = {
  title: "確認して承認",
  rentalDays: "{n}日間のレンタル",
  cardHold: "カードの仮押さえ",
  held: "仮押さえのみ・請求なし",
  fee: "レンタル料 · {n} × {price}",
  deposit: "返金される保証金",
  after: "問題なく返却後: {fee}を請求、{deposit}を解放。",
  step1: "{hold}を承認",
  step2: "受け取って楽しむ",
  step3: "返却 · {fee}を支払い",
  binding: "提携店でビンディング点検",
  card: "テストカード •••• 4242",
  cta: "{hold}の仮押さえを承認",
  authorizing: "承認中…",
  simulated: "模擬決済",
  failed: "仮押さえに失敗しました。請求はありません。",
  messageSeller: "出品者にメッセージ",
  emptyTitle: "この商品はレンタルできません",
  emptyBody: "ホームから他の商品を選んでください。",
  emptyBack: "ホームへ戻る",
};

export type ApproveKey = keyof Dict;

export function approveCopy(lang: Lang, key: ApproveKey, vars?: Record<string, string | number>): string {
  const text = (lang === "ja" ? ja : en)[key];
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : text;
}
