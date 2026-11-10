"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, PackageX } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ItemSummary } from "@/components/shared/ItemSummary";
import { QRCode } from "@/components/shared/QRCode";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useItem, useShop } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PhotoStep } from "./PhotoStep";
import { PhoneSkeleton } from "./Parts";
import { useRc } from "./RentalCopy";
import { codeGroups, feeOf, useNow, useRental } from "./terms";

type Step = { label: string; detail?: string };

/** Numbered steps in the Approve look: done is dark, current is crimson, the rest are quiet. */
function Steps({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        const last = i === steps.length - 1;
        return (
          <li
            key={s.label}
            aria-current={state === "active" ? "step" : undefined}
            className="relative flex h-10 items-center gap-4"
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[34px] left-[13px] h-[14px] w-px",
                  i < current ? "bg-ink" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold tabular-nums",
                state === "done" && "bg-ink text-ink-foreground",
                state === "active" && "bg-primary text-primary-foreground",
                state === "pending" && "bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[17px]",
                state === "pending" ? "text-muted-foreground" : "font-medium",
              )}
            >
              {s.label}
            </span>
            {s.detail && (
              <span className="shrink-0 text-[15px] text-muted-foreground tabular-nums">{s.detail}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const pillCls =
  "inline-flex h-8 shrink-0 items-center rounded-full bg-muted px-3 text-[15px] text-foreground tabular-nums";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="animate-rise">
      <h2 className="text-[20px] font-bold tracking-[-0.018em]">{title}</h2>
      {children}
    </section>
  );
}

export function RentalStatusView({ id }: { id: string }) {
  const { hydrated, rental } = useRental(id);
  const item = useItem(rental?.itemId);
  const shop = useShop(rental?.shopId);
  const now = useNow();
  const rc = useRc();
  const { t } = rc;
  const [panel, setPanel] = useState<"pickup" | "return" | null>(null);

  if (!hydrated) return <PhoneSkeleton />;
  if (!rental) {
    return (
      <div className="flex min-h-full flex-col">
        <ScreenHeader title={t("title")} backHref="/visit/trips" />
        <EmptyState
          icon={<PackageX />}
          title={t("notFound")}
          description={t("notFoundBody")}
          action={
            <Link href="/visit/home" className={buttonVariants({ variant: "outline", size: "lg" })}>
              {t("backHome")}
            </Link>
          }
          className="my-auto"
        />
      </div>
    );
  }

  const binding = item?.rental?.bindingCheckRequired ?? false;
  const offset = binding ? 1 : 0;
  const current = {
    reserved: 1,
    picked_up: 2 + offset,
    returned: 3 + offset,
    settled: 4 + offset,
  }[rental.status];
  const steps: Step[] = [
    { label: t("stepReserved") },
    ...(binding ? [{ label: t("stepBinding") }] : []),
    { label: t("stepPickup"), detail: rc.when(rental.pickupAt) },
    { label: t("stepReturn"), detail: rc.when(rental.returnBy) },
    { label: t("stepSettled") },
  ];
  const fee = feeOf(rental);
  const charged = rental.capturedCents ?? fee;
  const released = rental.releasedCents ?? rental.depositCents;
  const left = rc.left(rental.returnBy, now);
  const owner = shop?.ownerFirstName || shop?.name || t("owner");
  const settled = rental.status === "settled";

  const header = <ScreenHeader title={t("title")} backHref="/visit/trips" />;
  const summary = item && (
    <ItemSummary
      item={item}
      lines={[[shop?.ownerFirstName, shop?.neighborhood].filter(Boolean).join(" · ") || shop?.name || owner, t("days", { n: rental.days })]}
    />
  );

  if (panel) {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
          {summary}
          <div className="h-px bg-border" aria-hidden />
          {panel === "pickup" ? (
            <PhotoStep
              itemId={rental.itemId}
              cta={t("confirmPickup")}
              stages={[t("savingPhotos"), t("telling", { owner })]}
              onCancel={() => setPanel(null)}
              onSubmit={async (photos) => {
                await api.markPickedUp(rental.id, photos);
                setPanel(null);
              }}
            />
          ) : (
            <PhotoStep
              itemId={rental.itemId}
              cta={t("sendReturn")}
              scratchToggle
              stages={[t("sendingPhotos"), t("checkingWith", { owner })]}
              onCancel={() => setPanel(null)}
              onSubmit={async (photos) => {
                await api.submitReturn(rental.id, photos);
                setPanel(null);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {header}
      <div className="flex flex-1 flex-col gap-4 px-4 pb-3">
        {summary}
        <div className="h-px bg-border" aria-hidden />

        {rental.status === "reserved" && (
          <Block title={t("pickupCode")}>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[40px] leading-none font-semibold tracking-[0.04em] tabular-nums">
                  {codeGroups(rental.pickupCode)}
                </p>
                <p className="mt-3 text-[15px] text-muted-foreground">{t("showTo", { owner })}</p>
              </div>
              <QRCode value={`pickup:${rental.id}:${rental.pickupCode}`} size={96} className="shrink-0 p-2" />
            </div>
          </Block>
        )}

        {rental.status === "picked_up" && (
          <Block title={t("returnBy")}>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-[32px] leading-tight font-bold tracking-tight tabular-nums">
                {rc.when(rental.returnBy)}
              </p>
              {left && <span className={pillCls}>{left}</span>}
            </div>
          </Block>
        )}

        {rental.status === "returned" && (
          <Block title={t("returnSent")}>
            <p className="mt-1 text-[28px] leading-tight font-bold tracking-tight">
              {(() => { const line = t("checking", { owner }); return line.charAt(0).toUpperCase() + line.slice(1); })()}
            </p>
            <p className="mt-2 text-[15px] text-muted-foreground">{t("releasedAfter")}</p>
          </Block>
        )}

        {settled && (
          <Block title={t("charged")}>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-[40px] leading-none font-bold tracking-tight tabular-nums">{money(charged)}</p>
              <span className={pillCls}>{t("holdReleased", { amount: money(released) })}</span>
            </div>
          </Block>
        )}

        <div className="h-px bg-border" aria-hidden />
        <Steps steps={steps} current={current} />

        {!settled && (
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
            <div>
              <p className="text-[17px] font-semibold">{t("cardHold")}</p>
              <p className="text-[13px] text-muted-foreground">{t("held")}</p>
            </div>
            <p className="text-[22px] font-bold tabular-nums">{money(rental.holdCents)}</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto bg-card px-4 pt-2 pb-4">
        {rental.status === "reserved" && (
          <Button size="lg" className="h-12 w-full rounded-xl text-[17px] font-semibold" onClick={() => setPanel("pickup")}>
            {t("confirmPickup")}
          </Button>
        )}
        {rental.status === "picked_up" && (
          <Button size="lg" className="h-12 w-full rounded-xl text-[17px] font-semibold" onClick={() => setPanel("return")}>
            {t("startReturn")}
          </Button>
        )}
        {rental.status === "returned" && (
          <Link
            href={`/sell/rentals/${rental.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 w-full rounded-xl text-[17px] font-semibold")}
          >
            {t("ownerCheck")}
            <ArrowRight data-icon="inline-end" />
          </Link>
        )}
        {settled && (
          <Link
            href={`/visit/receipt/${rental.id}`}
            className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-xl text-[17px] font-semibold")}
          >
            {t("viewReceipt")}
          </Link>
        )}
      </div>
    </div>
  );
}
