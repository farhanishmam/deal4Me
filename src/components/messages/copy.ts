import { money, shortDate } from "@/lib/format";
import type { MessageRole } from "@/lib/messages";
import { useStore } from "@/lib/store";
import type { Negotiation } from "@/lib/types";

export type Tongue = "en" | "ja";

const STRINGS = {
  en: {
    title: "Messages",
    loading: "Loading your messages",
    emptyTitle: "Messages open once you agree on a deal",
    emptyBuyer: "Find something to rent",
    emptySeller: "View your listings",
    noMessages: "No messages yet",
    you: "You: ",
    now: "Now",
    minutes: (n: number) => `${n}m`,
    hours: (n: number) => `${n}h`,
    yesterday: "Yesterday",
    agreed: (price: string) => `You agreed on ${price}`,
    notFoundTitle: "This conversation isn't here",
    notFoundBody: "It may belong to another store, or the deal was never agreed.",
    backToMessages: "Back to messages",
    placeholder: "Write a message",
    send: "Send",
    notSent: "Not sent",
    retrying: "Not sent yet, retrying",
    back: "Back",
    unread: "Unread",
    buyerFallback: "Buyer",
    sellerFallback: "Seller",
    day: "day",
    days: "days",
  },
  ja: {
    title: "メッセージ",
    loading: "メッセージを読み込み中",
    emptyTitle: "取引が成立するとメッセージが使えます",
    emptyBuyer: "借りるものを探す",
    emptySeller: "出品を見る",
    noMessages: "まだメッセージはありません",
    you: "あなた: ",
    now: "たった今",
    minutes: (n: number) => `${n}分前`,
    hours: (n: number) => `${n}時間前`,
    yesterday: "昨日",
    agreed: (price: string) => `${price}で合意しました`,
    notFoundTitle: "この会話は見つかりません",
    notFoundBody: "別のお店の会話か、取引が成立していない可能性があります。",
    backToMessages: "メッセージに戻る",
    placeholder: "メッセージを入力",
    send: "送信",
    notSent: "送信できませんでした",
    retrying: "未送信・再送信中",
    back: "戻る",
    unread: "未読",
    buyerFallback: "購入者",
    sellerFallback: "出品者",
    day: "日間",
    days: "日間",
  },
} as const;

export type Strings = (typeof STRINGS)[Tongue];

/** Buyers follow their visitor language. The seller app is English. */
export function useCopy(role: MessageRole): { t: Strings; tongue: Tongue } {
  const language = useStore((s) => s.visitor.language);
  const tongue: Tongue = role === "buyer" && language === "ja" ? "ja" : "en";
  return { t: STRINGS[tongue], tongue };
}

/** "$25 / day", or the plain "$80" for a purchase. */
export function dailyPrice(n: Negotiation, tongue: Tongue): string {
  const cents = n.agreedDailyCents ?? n.rounds.at(-1)?.offerCents ?? n.askingCents;
  if (n.kind === "sale") return money(cents);
  return tongue === "ja" ? `${money(cents)}/日` : `${money(cents)} / day`;
}

/** "3 days"; empty for a purchase. */
export function stay(n: Negotiation, tongue: Tongue): string {
  if (n.kind === "sale") return "";
  return tongue === "ja" ? `${n.days}日間` : `${n.days} ${n.days === 1 ? "day" : "days"}`;
}

/** "$25 / day · 3 days", or "$80" for a purchase. */
export function dealLine(n: Negotiation, tongue: Tongue): string {
  return [dailyPrice(n, tongue), stay(n, tongue)].filter(Boolean).join(" · ");
}

/** Short relative time: Now, 5m, 2h, Yesterday, Nov 7. */
export function relativeTime(iso: string | undefined, t: Strings, now = Date.now()): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor((now - ms) / 60_000);
  if (mins < 1) return t.now;
  if (mins < 60) return t.minutes(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.hours(hours);
  if (hours < 48) return t.yesterday;
  return shortDate(iso);
}

/** The other side of a thread. Buyers see the shop (or its owner), sellers see the visitor. */
export function partyName(
  role: MessageRole,
  shop: { name?: string; ownerFirstName?: string } | undefined,
  visitorFirstName: string | undefined,
  t: Strings,
): string {
  if (role === "buyer") return shop?.name?.trim() || shop?.ownerFirstName?.trim() || t.sellerFallback;
  return visitorFirstName?.trim() || t.buyerFallback;
}
