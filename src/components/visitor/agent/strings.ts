import type { Lang } from "@/lib/types";

/** Agent chat copy. English and Japanese only; everything else reads English. */
const en = {
  title: "Chat",
  empty: "What do you need today?",
  placeholder: "Ask for gear or food",
  send: "Send",
  newChat: "New chat",
  history: "Saved chats",
  savedTitle: "Saved chats",
  savedEmpty: "Your chats and deals will show up here.",
  noDeal: "No deal",
  inProgress: "In progress",
  dealAt: (price: string) => `Deal at ${price} / day`,
  unnamedItem: "Rental",
  now: "Just now",
  did: "What I did",
  negotiate: "Negotiate for me",
  view: "View",
  order: "Order",
  details: "Details",
  perDay: " / day",
  deposit: (amount: string) => `${amount} deposit · held, not charged`,
  errorText: "That did not go through.",
  retry: "Try again",
  chips: [
    "I need ski gear for tomorrow, $250 max",
    "Where can I get tacos?",
  ],
  phases: ["Reading your request", "Searching nearby listings", "Checking your budget"],
};

const ja: typeof en = {
  title: "チャット",
  empty: "今日は何をお探しですか",
  placeholder: "ギアや食事を聞いてみる",
  send: "送信",
  newChat: "新しい会話",
  history: "保存した会話",
  savedTitle: "保存した会話",
  savedEmpty: "会話と交渉はここに残ります。",
  noDeal: "不成立",
  inProgress: "交渉中",
  dealAt: (price: string) => `成立 ${price} / 日`,
  unnamedItem: "レンタル",
  now: "たった今",
  did: "実行した内容",
  negotiate: "交渉をお願い",
  view: "詳細",
  order: "注文",
  details: "詳細",
  perDay: " / 日",
  deposit: (amount: string) => `保証金 ${amount} · 保留のみ、請求なし`,
  errorText: "うまくいきませんでした。",
  retry: "もう一度",
  chips: ["明日スキーに行きたい。予算は250ドル", "タコスはどこで買えますか"],
  phases: ["ご依頼を確認中", "近くの商品を検索中", "ご予算を確認中"],
};

export type AgentStrings = typeof en;

export function agentStrings(lang: Lang): AgentStrings {
  return lang === "ja" ? ja : en;
}
