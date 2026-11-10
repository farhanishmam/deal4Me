"use client";

import { APP_TIME_ZONE } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

/** Copy for the rental status and receipt screens. English and Japanese; anything else shows English. */
const en = {
  title: "Your rental",
  receipt: "Receipt",
  notFound: "Rental not found",
  notFoundBody: "It may have been cleared with the demo data.",
  backHome: "Back to Home",
  days: "{n}-day rental",
  pickupCode: "Pickup code",
  showTo: "Show this to {owner}",
  returnBy: "Return by",
  returnSent: "Return sent",
  checking: "{owner} is checking the gear",
  releasedAfter: "Hold released after the check",
  charged: "Charged",
  holdReleased: "{amount} hold released",
  cardHold: "Card hold",
  held: "Held, not charged",
  stepReserved: "Reserved",
  stepBinding: "Binding check",
  stepPickup: "Pick up",
  stepReturn: "Return",
  stepSettled: "Settled",
  confirmPickup: "Confirm pickup",
  startReturn: "Start return",
  ownerCheck: "Owner's return check",
  viewReceipt: "View receipt",
  overdue: "Overdue",
  left: "{t} left",
  photoTitle: "Photograph the gear",
  sample: "Use sample photos",
  scratch: "Demo: add a scratch",
  cancel: "Not now",
  failed: "That didn't save. Nothing changed. Try again.",
  addPhoto: "Add photo",
  savingPhotos: "Saving photos",
  telling: "Telling {owner}",
  sendReturn: "Send return",
  sendingPhotos: "Sending photos",
  checkingWith: "Checking with {owner}'s agent",
  rentalFee: "Rental fee",
  damage: "Damage charge",
  depositReleased: "Deposit released",
  fromDeposit: "From the deposit",
  card: "Test card •••• 4242",
  rate: "Rate {owner}",
  thanks: "Thanks",
  noReceipt: "No receipt yet",
  noReceiptBody: "It appears once the owner settles.",
  noRental: "We can't find this rental.",
  backRental: "Back to rental",
  backTrips: "Back to Trips",
  stars: "{n} stars",
  owner: "the owner",
};

type Dict = typeof en;

const ja: Dict = {
  title: "レンタル",
  receipt: "領収書",
  notFound: "レンタルが見つかりません",
  notFoundBody: "デモデータと一緒に消えた可能性があります。",
  backHome: "ホームへ戻る",
  days: "{n}日間レンタル",
  pickupCode: "受け取りコード",
  showTo: "{owner}さんに見せてください",
  returnBy: "返却期限",
  returnSent: "返却を送信しました",
  checking: "{owner}さんが確認中です",
  releasedAfter: "確認後にホールドを解除します",
  charged: "請求額",
  holdReleased: "{amount}のホールドを解除",
  cardHold: "カードの仮押さえ",
  held: "仮押さえのみ・請求なし",
  stepReserved: "予約済み",
  stepBinding: "ビンディング確認",
  stepPickup: "受け取り",
  stepReturn: "返却",
  stepSettled: "精算済み",
  confirmPickup: "受け取りを確認",
  startReturn: "返却を始める",
  ownerCheck: "オーナーの返却確認",
  viewReceipt: "領収書を見る",
  overdue: "期限超過",
  left: "残り{t}",
  photoTitle: "ギアを撮影",
  sample: "サンプル写真を使う",
  scratch: "デモ：傷を追加",
  cancel: "あとで",
  failed: "保存できませんでした。変更はありません。もう一度お試しください。",
  addPhoto: "写真を追加",
  savingPhotos: "写真を保存中",
  telling: "{owner}さんに連絡中",
  sendReturn: "返却を送信",
  sendingPhotos: "写真を送信中",
  checkingWith: "{owner}さんのエージェントが確認中",
  rentalFee: "レンタル料",
  damage: "破損料",
  depositReleased: "デポジット返金",
  fromDeposit: "デポジットから",
  card: "テストカード •••• 4242",
  rate: "{owner}さんを評価",
  thanks: "ありがとう",
  noReceipt: "領収書はまだありません",
  noReceiptBody: "オーナーが精算すると表示されます。",
  noRental: "このレンタルが見つかりません。",
  backRental: "レンタルへ戻る",
  backTrips: "旅程へ戻る",
  stars: "星{n}つ",
  owner: "オーナー",
};

const dicts: Partial<Record<Lang, Dict>> = { en, ja };
export type CopyKey = keyof Dict;

const LOCALES: Partial<Record<Lang, string>> = { en: "en-US", ja: "ja-JP" };
const formats = new Map<string, Intl.DateTimeFormat>();

function fmt(lang: Lang, kind: "date" | "time" | "range") {
  const locale = LOCALES[lang] ?? "en-US";
  const key = `${locale}:${kind}`;
  let f = formats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(
      locale,
      kind === "date"
        ? { timeZone: APP_TIME_ZONE, month: "short", day: "numeric" }
        : { timeZone: APP_TIME_ZONE, hour: "numeric", minute: "2-digit" },
    );
    formats.set(key, f);
  }
  return f;
}

function parts(lang: Lang, iso: string): { d: string; t: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { d: fmt(lang, "date").format(date), t: fmt(lang, "time").format(date) };
}

/** Copy lookup plus date helpers in the visitor's language. */
export function useRc() {
  const lang = useStore((s) => s.visitor.language);
  const dict = dicts[lang] ?? en;
  const t = (key: CopyKey, vars?: Record<string, string | number>): string => {
    let text = dict[key] ?? en[key];
    if (vars) for (const k of Object.keys(vars)) text = text.replaceAll(`{${k}}`, String(vars[k]));
    return text;
  };
  /** "Nov 7 · 12:00 PM" */
  const when = (iso: string): string => {
    const p = parts(lang, iso);
    return p ? `${p.d} · ${p.t}` : iso;
  };
  /** "Nov 7 – Nov 11" */
  const range = (a: string, b: string): string => {
    const x = parts(lang, a);
    const y = parts(lang, b);
    return x && y ? `${x.d} – ${y.d}` : "";
  };
  /** "1d 5h", "3h 20m", "Overdue". Empty until the clock is running. */
  const left = (returnBy: string, now: number): string => {
    if (!now) return "";
    const ms = Date.parse(returnBy) - now;
    if (!Number.isFinite(ms)) return "";
    if (ms <= 0) return t("overdue");
    const mins = Math.floor(ms / 60_000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const short =
      lang === "ja"
        ? d > 0 ? `${d}日${h}時間` : h > 0 ? `${h}時間${m}分` : `${m}分`
        : d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
    return t("left", { t: short });
  };
  return { lang, t, when, range, left };
}
