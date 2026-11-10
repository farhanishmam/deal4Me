"use client";

import { useMinuteClock } from "@/components/dashboard/hooks";
import { APP_TIME_ZONE } from "@/lib/format";
import type { Item, Lang } from "@/lib/types";

export function availabilityWindow(item: Pick<Item, "availableFrom" | "availableUntil">, lang: Lang = "en"): string {
  const format = (value: string) => new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
    timeZone: APP_TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
  if (item.availableFrom && item.availableUntil) return `${format(item.availableFrom)} – ${format(item.availableUntil)}`;
  if (item.availableFrom) return `${lang === "ja" ? "開始" : "From"} ${format(item.availableFrom)}`;
  if (item.availableUntil) return `${lang === "ja" ? "終了" : "Until"} ${format(item.availableUntil)}`;
  return lang === "ja" ? "日時は出品者に確認" : "Dates flexible · confirm with seller";
}

export function AvailabilitySummary({ item, lang = "en", compact = false }: { item: Item; lang?: Lang; compact?: boolean }) {
  const now = useMinuteClock();
  const expired = !!item.availableUntil && now > Date.parse(item.availableUntil);
  const future = !!item.availableFrom && now > 0 && now < Date.parse(item.availableFrom);
  const unavailable = !item.available || expired;
  const label = lang === "ja"
    ? unavailable ? "利用不可" : future ? "今後利用可能" : "利用可能"
    : unavailable ? "Unavailable" : future ? "Available later" : "Available";
  return (
    <div className={compact ? "mt-1 space-y-0.5 text-[13px]" : "space-y-2 rounded-xl bg-muted/60 p-3 text-[14px]"}>
      <p className={`font-semibold ${unavailable ? "text-muted-foreground" : "text-success"}`}>{label}</p>
      <p className="text-muted-foreground">{availabilityWindow(item, lang)}</p>
      {!!item.sizes?.length && <p className="text-muted-foreground">{lang === "ja" ? "サイズ" : "Sizes"}: {item.sizes.join(", ")}</p>}
    </div>
  );
}
