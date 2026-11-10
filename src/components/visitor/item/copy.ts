import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

const en = {
  "back": "Back",
  "home": "Back to home",
  "perDay": "{price} / day",
  "km": "{n} km",
  "days": "Days",
  "day1": "1 day",
  "dayN": "{n} days",
  "total": "{n} days, {total}",
  "deposit": "{deposit} deposit, held, not charged",
  "binding": "Binding check at a partner shop",
  "negotiate": "Let my agent negotiate",
  "rent": "Rent at {price}/day",
  "forSale": "For sale",
  "buy": "Reserve for {price}",
  "reserving": "Holding it for you",
  "reservedTitle": "Reserved",
  "reservedBody": "Pay {name} when you pick it up.",
  "gone": "Not available right now",
  "missingTitle": "Item not found",
  "missingBody": "It may have been taken down.",
  "chooseDates": "Choose dates & size",
  "requestItem": "Request this item",
  "reqSent": "Request sent",
  "reqSentBody": "The seller can now see your request.",
  "reqSentNote": "Your dates and details are saved. The seller still needs to confirm.",
  "reqSize": "Size {size}.",
  "reqNegotiate": "Negotiate this request",
  "done": "Done",
  "pickup": "Pickup time",
  "whenLike": "When would you like it?",
  "returnTime": "Return time",
  "sizeLabel": "Clothing or ski size",
  "chooseSize": "Choose a size",
  "sizeHint": "For example M, boot 26.5, or skis 170 cm",
  "estRental": "Estimated {n}-day rental",
  "listed": "Listed price",
  "agreed": "Agreed price",
  "sendRequest": "Send request",
  "errTimes": "Choose pickup and return times.",
  "errValid": "Choose valid dates.",
  "errOrder": "Return time must be after pickup.",
  "errSize": "Choose your size.",
  "errSend": "Could not send this request.",
};

const ja: Record<keyof typeof en, string> = {
  "back": "戻る",
  "home": "ホームに戻る",
  "perDay": "{price} / 日",
  "km": "{n} km",
  "days": "日数",
  "day1": "1日間",
  "dayN": "{n}日間",
  "total": "{n}日間、{total}",
  "deposit": "保証金{deposit}、保留のみ、請求なし",
  "binding": "提携ショップでビンディング点検",
  "negotiate": "エージェントに交渉を任せる",
  "rent": "{price}/日で借りる",
  "forSale": "販売中",
  "buy": "{price}で取り置く",
  "reserving": "取り置き中",
  "reservedTitle": "取り置き済み",
  "reservedBody": "受け取り時に{name}さんへお支払いください。",
  "gone": "現在ご利用いただけません",
  "missingTitle": "見つかりません",
  "missingBody": "掲載が終了したようです。",
  "chooseDates": "日時とサイズを選ぶ",
  "requestItem": "この商品をリクエスト",
  "reqSent": "リクエストを送信しました",
  "reqSentBody": "出品者にリクエストが届きました。",
  "reqSentNote": "日時と内容を保存しました。出品者の確認をお待ちください。",
  "reqSize": "サイズ {size}。",
  "reqNegotiate": "このリクエストを交渉する",
  "done": "完了",
  "pickup": "受け取り日時",
  "whenLike": "ご希望の日時",
  "returnTime": "返却日時",
  "sizeLabel": "服またはスキーのサイズ",
  "chooseSize": "サイズを選択",
  "sizeHint": "例: M、ブーツ26.5、スキー170 cm",
  "estRental": "{n}日間のレンタル料金の目安",
  "listed": "掲載価格",
  "agreed": "合意価格",
  "sendRequest": "リクエストを送る",
  "errTimes": "受け取りと返却の日時を選んでください。",
  "errValid": "正しい日時を選んでください。",
  "errOrder": "返却は受け取りより後にしてください。",
  "errSize": "サイズを選んでください。",
  "errSend": "リクエストを送れませんでした。",
};

type Key = keyof typeof en;
const dictionaries: Partial<Record<Lang, Record<Key, string>>> = { en, ja };

export const LOCALES: Record<Lang, string> = {
  en: "en-US",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ko: "ko-KR",
  zh: "zh-CN",
};

export function useC() {
  const lang = useStore((s) => s.visitor.language);
  const dict = dictionaries[lang] ?? en;
  const c = (key: Key, vars?: Record<string, string | number>) => {
    let text = dict[key] ?? en[key];
    if (vars) for (const k of Object.keys(vars)) text = text.replaceAll(`{${k}}`, String(vars[k]));
    return text;
  };
  return { lang, c };
}
