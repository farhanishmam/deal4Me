"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useMinuteClock } from "@/components/dashboard/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Item, ItemRequest } from "@/lib/types";
import { useC } from "./copy";

const DAY_MS = 86_400_000;
const toLocal = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
};

/** Tomorrow at 10:00, unless the item opens later. */
function defaultPickup(item: Item): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const from = item.availableFrom ? Date.parse(item.availableFrom) : NaN;
  return toLocal(new Date(Number.isFinite(from) && from > d.getTime() ? from : d.getTime()).toISOString());
}

/** Full-screen request form that sits inside the phone, in place of the item page. */
export function ItemRequestSheet({ item, onClose, defaultDays = 1, initialRequest, negotiationId }: { item: Item; onClose: () => void; defaultDays?: number; initialRequest?: { startsAt?: string; endsAt?: string; size?: string }; negotiationId?: string }) {
  const { c } = useC();
  const profile = useStore((state) => state.visitor);
  const setVisitor = useStore((state) => state.setVisitor);
  const rental = item.kind === "rental";
  // A deal for this item carries its agreed price into the request; any other id is a normal request.
  const deal = useStore((state) => (negotiationId ? state.negotiations.find((n) => n.id === negotiationId) : undefined));
  const agreedCents = deal && deal.itemId === item.id && deal.status === "deal" ? deal.agreedDailyCents : undefined;
  const dealId = agreedCents !== undefined ? deal?.id : undefined;
  const [start, setStart] = useState(() => toLocal(initialRequest?.startsAt) || defaultPickup(item));
  const [end, setEnd] = useState(() => {
    const given = toLocal(initialRequest?.endsAt);
    if (given && initialRequest?.startsAt) return given;
    const from = toLocal(initialRequest?.startsAt) || defaultPickup(item);
    return toLocal(new Date(new Date(from).getTime() + defaultDays * DAY_MS).toISOString());
  });
  const preferredSize = initialRequest?.size ?? profile.preferredSize ?? "";
  const [size, setSize] = useState(item.sizes?.includes(preferredSize) || !item.sizes?.length ? preferredSize : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<ItemRequest | null>(null);
  const now = useMinuteClock();
  const available = item.available && (!item.availableUntil || !now || now <= Date.parse(item.availableUntil));
  const startsAt = start ? new Date(start) : null;
  const endsAt = end ? new Date(end) : null;
  const days = startsAt && endsAt ? Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / DAY_MS)) : defaultDays;
  const total = rental ? (agreedCents ?? item.rental?.dailyFeeCents ?? 0) * days : agreedCents ?? item.priceCents ?? 0;

  function setPickup(value: string) {
    setStart(value);
    if (value && (!end || Date.parse(end) <= Date.parse(value))) {
      setEnd(toLocal(new Date(Date.parse(value) + defaultDays * DAY_MS).toISOString()));
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (rental && (!startsAt || !endsAt)) return setError(c("errTimes"));
    if ((startsAt && !Number.isFinite(startsAt.getTime())) || (endsAt && !Number.isFinite(endsAt.getTime()))) return setError(c("errValid"));
    if (rental && startsAt && endsAt && endsAt <= startsAt) return setError(c("errOrder"));
    if (item.sizes?.length && !size.trim()) return setError(c("errSize"));
    setSaving(true);
    try {
      const request = await api.requestItem({
        itemId: item.id, startsAt: startsAt?.toISOString(), endsAt: rental ? endsAt?.toISOString() : undefined,
        size: size.trim() || undefined, negotiationId: dealId,
      });
      setVisitor({ preferredSize: size.trim() || undefined, ...(rental ? { tripStart: request.startsAt ?? "", tripEnd: request.endsAt ?? "" } : {}) });
      setSaved(request);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : c("errSend"));
    } finally { setSaving(false); }
  }

  const query = saved ? new URLSearchParams({ days: String(days), requestId: saved.id, ...(saved.startsAt ? { startsAt: saved.startsAt } : {}), ...(saved.endsAt ? { endsAt: saved.endsAt } : {}), ...(saved.size ? { size: saved.size } : {}) }) : null;

  function close() {
    if (!saving) onClose();
  }

  return (
    <div className="flex min-h-full flex-col bg-card">
      <header className="flex h-12 shrink-0 items-center gap-3 px-4">
        <button type="button" onClick={close} aria-label={c("back")} className="-ml-2 flex size-10 items-center justify-center rounded-full outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15">
          <ArrowLeft className="size-[22px]" strokeWidth={2} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.018em]">{saved ? c("reqSent") : rental ? c("chooseDates") : c("requestItem")}</h1>
      </header>
      <p className="truncate px-4 pb-2 text-[14px] text-muted-foreground">{item.name}</p>
      {saved ? (
        <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <p role="status" className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success"><Check className="size-5" />{c("reqSentBody")}</p>
          <p className="text-sm text-muted-foreground">{saved.size ? `${c("reqSize", { size: saved.size })} ` : ""}{c("reqSentNote")}</p>
          <div className="mt-auto flex flex-col gap-2">
            {rental && <Link href={`/visit/negotiate/${item.id}?${query}`} className={buttonVariants({ className: "h-12 w-full rounded-xl text-[17px]" })}>{c("reqNegotiate")}</Link>}
            <Button variant="outline" className="h-12 w-full rounded-xl" onClick={close}>{c("done")}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <label className="block space-y-1.5 text-sm font-medium">
            <span>{rental ? c("pickup") : c("whenLike")}</span>
            <Input type="datetime-local" aria-label={c("pickup")} value={start} onChange={(event) => setPickup(event.target.value)} onInput={(event) => setPickup(event.currentTarget.value)} min={toLocal(item.availableFrom)} max={toLocal(item.availableUntil)} required={rental} className="h-11" />
          </label>
          {rental && <label className="block space-y-1.5 text-sm font-medium"><span>{c("returnTime")}</span><Input type="datetime-local" aria-label={c("returnTime")} value={end} onChange={(event) => setEnd(event.target.value)} onInput={(event) => setEnd(event.currentTarget.value)} min={start || toLocal(item.availableFrom)} max={toLocal(item.availableUntil)} required className="h-11" /></label>}
          <label className="block space-y-1.5 text-sm font-medium">
            <span>{c("sizeLabel")}</span>
            {item.sizes?.length ? (
              <select aria-label={c("sizeLabel")} value={size} onChange={(event) => setSize(event.target.value)} required className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"><option value="">{c("chooseSize")}</option>{item.sizes.map((option) => <option key={option} value={option}>{option}</option>)}</select>
            ) : <Input aria-label={c("sizeLabel")} value={size} maxLength={80} onChange={(event) => setSize(event.target.value)} placeholder={c("sizeHint")} className="h-11" />}
          </label>
          <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm"><span>{rental ? c("estRental", { n: days }) : c(agreedCents !== undefined ? "agreed" : "listed")}</span><strong className="tabular-nums">{money(total)}</strong></div>
          <div className="sticky bottom-0 mt-auto space-y-2 bg-card pt-2">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={saving || !available} className="h-12 w-full rounded-xl text-[17px]">{saving && <Loader2 className="size-4 animate-spin" />}{c("sendRequest")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
