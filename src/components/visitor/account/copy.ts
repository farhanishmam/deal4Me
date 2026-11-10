import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

/** Copy for the profile and bookings screens. English and Japanese; other languages read English. */
const en = {
  "profile.title": "Profile",
  "profile.addName": "Add your name",
  "profile.name": "First name",
  "profile.language": "Language",
  "profile.card": "Card",
  "profile.cardValue": "•••• 4242 (test)",
  "profile.bookings": "Bookings",
  "profile.chats": "Saved chats",
  "profile.messages": "Messages",
  "profile.switch": "Switch to selling",

  "trips.title": "Bookings",
  "trips.loading": "Loading your bookings",
  "trips.rentals": "Rentals",
  "trips.orders": "Orders",
  "trips.emptyTitle": "No bookings yet",
  "trips.emptyBody": "Rentals and orders you make will show up here.",
  "trips.browse": "Find something",
  "trips.rental": "Rental",
  "trips.items": "{n} items",
  "trips.item": "1 item",
  "trips.pickupAt": "Pickup {time}",

  "status.reserved": "Reserved",
  "status.picked_up": "Picked up",
  "status.returned": "Returned",
  "status.settled": "Settled",
  "status.placed": "Placed",
  "status.accepted": "Accepted",
  "status.ready": "Ready",
} as const;

export type CopyKey = keyof typeof en;

const ja: Record<CopyKey, string> = {
  "profile.title": "プロフィール",
  "profile.addName": "名前を追加",
  "profile.name": "名",
  "profile.language": "言語",
  "profile.card": "カード",
  "profile.cardValue": "•••• 4242 (テスト)",
  "profile.bookings": "予約",
  "profile.chats": "保存したチャット",
  "profile.messages": "メッセージ",
  "profile.switch": "出品者モードに切り替え",

  "trips.title": "予約",
  "trips.loading": "予約を読み込み中",
  "trips.rentals": "レンタル",
  "trips.orders": "注文",
  "trips.emptyTitle": "予約はまだありません",
  "trips.emptyBody": "レンタルや注文がここに表示されます。",
  "trips.browse": "探す",
  "trips.rental": "レンタル",
  "trips.items": "{n}点",
  "trips.item": "1点",
  "trips.pickupAt": "受け取り {time}",

  "status.reserved": "予約済み",
  "status.picked_up": "受け取り済み",
  "status.returned": "返却済み",
  "status.settled": "精算済み",
  "status.placed": "受付済み",
  "status.accepted": "承認済み",
  "status.ready": "準備完了",
};

const dictionaries: Partial<Record<Lang, Partial<Record<CopyKey, string>>>> = { en, ja };

export function copy(lang: Lang, key: CopyKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[lang]?.[key] ?? en[key];
  if (vars) for (const name of Object.keys(vars)) text = text.replaceAll(`{${name}}`, String(vars[name]));
  return text;
}

/** The visitor's language and a bound copy function. */
export function useC() {
  const lang = useStore((s) => s.visitor.language);
  return { lang, c: (key: CopyKey, vars?: Record<string, string | number>) => copy(lang, key, vars) };
}
