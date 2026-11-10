import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

const en = {
  "back": "Back",
  "home": "Back to home",
  "pickup": "Pickup",
  "asap": "ASAP",
  "plus15": "+15 min",
  "plus30": "+30 min",
  "notePh": "Add a note for the kitchen",
  "pay": "Pay {total}",
  "empty": "Choose something",
  "sending": "Sending to {shop}",
  "error": "The order did not go through. Try again.",
  "card": "Test card •••• 4242",
  "placed": "Order placed",
  "code": "Pickup code",
  "ready": "Ready by {time}",
  "trips": "See my trips",
  "missingTitle": "Shop not found",
  "noMenu": "No menu yet",
  "missingBody": "There is no menu here yet.",
  "add": "Add",
  "less": "Remove one",
  "more": "Add one",
  "title": "Your order",
};

type Key = keyof typeof en;

const ja: Record<Key, string> = {
  back: "戻る",
  home: "ホームへ戻る",
  pickup: "受け取り",
  asap: "すぐ",
  plus15: "15分後",
  plus30: "30分後",
  notePh: "お店へのメモを追加",
  pay: "{total}を支払う",
  empty: "商品を選んでください",
  sending: "{shop}に送信中",
  error: "注文できませんでした。もう一度お試しください。",
  card: "テストカード •••• 4242",
  placed: "注文を受け付けました",
  code: "受け取りコード",
  ready: "{time}までに準備",
  trips: "旅程を見る",
  missingTitle: "お店が見つかりません",
  noMenu: "メニューはまだありません",
  missingBody: "メニューはまだありません。",
  add: "追加",
  less: "1つ減らす",
  more: "1つ増やす",
  title: "ご注文",
};

const dictionaries: Partial<Record<Lang, Record<Key, string>>> = { en, ja };

export function useO() {
  const lang = useStore((s) => s.visitor.language);
  return (key: Key, vars?: Record<string, string | number>) => {
    let text = dictionaries[lang]?.[key] ?? en[key];
    if (vars) for (const k of Object.keys(vars)) text = text.replaceAll(`{${k}}`, String(vars[k]));
    return text;
  };
}
