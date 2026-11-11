"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, Loader2, PackageX, ShieldCheck, TriangleAlert, Check } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PhotoSlot } from "@/components/shared/PhotoSlot";
import { StatusPill } from "@/components/shared/StatusPill";
import type { PillTone } from "@/components/shared/StatusPill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useItem, useStore } from "@/lib/store";
import type { Rental, RentalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Hairline, Row } from "./Parts";
import { feeOf, useRental, when } from "./terms";

const PILL: Record<RentalStatus, { tone: PillTone; label: string }> = {
  reserved: { tone: "info", label: "Reserved" },
  picked_up: { tone: "warning", label: "Out on rent" },
  returned: { tone: "info", label: "Waiting for you" },
  settled: { tone: "success", label: "Settled" },
};

function Card({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className={cn("flex animate-rise flex-col rounded-xl border border-border bg-card p-6", className)}
    >
      {children}
    </section>
  );
}

function PhotoColumn({ title, photos, waiting }: { title: string; photos: string[]; waiting?: string }) {
  const tiles = [0, 1, 2];
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-3 text-label text-muted-foreground">{title}</p>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((i) =>
          photos[i] ? (
            <PhotoSlot key={i} state="identified" src={photos[i]} className="aspect-[4/3]" />
          ) : (
            <div
              key={i}
              className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40"
            />
          )
        )}
      </div>
      {waiting && photos.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{waiting}</p>}
    </div>
  );
}

function CheckCard({ rental }: { rental: Rental }) {
  const check = rental.damageCheck;
  if (!check) return null;
  const clear = check.result === "clear";
  return (
    <Card delay={60}>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
            clear ? "bg-success-soft text-success" : "bg-warning-soft text-warning-text"
          )}
        >
          {clear ? <ShieldCheck /> : <TriangleAlert />}
        </span>
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-muted-foreground">AI check</p>
          <h2 className={cn("mt-1 text-heading", clear ? "text-success" : "text-warning-text")}>
            {clear ? "No new damage found" : "Possible scratch, please review"}
          </h2>
          {clear && <p className="mt-1 text-sm text-muted-foreground">{check.note}</p>}
        </div>
      </div>
      <div className="my-5">
        <Hairline />
      </div>
      <p className="text-sm font-medium">A person makes the final call.</p>
    </Card>
  );
}

export function ReturnCheckView({ id }: { id: string }) {
  const { hydrated, rental } = useRental(id);
  const item = useItem(rental?.itemId);
  const visitor = useStore((s) => s.visitor);
  const logStep = useStore((s) => s.logStep);
  const [mode, setMode] = useState<"idle" | "damage">("idle");
  const [stage, setStage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const header = (
    <header className="animate-rise flex items-end justify-between gap-4">
      <div>
        <Link
          href="/sell/dashboard"
          className="-ml-1 inline-flex items-center gap-0.5 rounded-md text-label text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
        >
          <ChevronLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-1 text-title">Return check</h1>
        {rental && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[item?.name ?? "Rental", visitor.firstName].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {rental && (
        <StatusPill tone={PILL[rental.status].tone} dot>
          {PILL[rental.status].label}
        </StatusPill>
      )}
    </header>
  );

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true">
        {header}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-xl bg-muted lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          icon={<PackageX />}
          title="Rental not found"
          description="It may have been cleared with the demo data."
          action={
            <Link href="/sell/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Back to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  const fee = feeOf(rental);
  const deposit = rental.depositCents;
  const busy = stage !== null;
  const extraCents = Math.round((Number(amount) || 0) * 100);
  const extraOk = extraCents > 0 && extraCents <= deposit && note.trim().length > 0;
  const charge = fee + (mode === "damage" ? Math.min(extraCents, deposit) : 0);

  async function settle(extra: number) {
    if (busy || !rental) return;
    setFailed(false);
    setStage(`Charging ${money(fee + extra)}`);
    const t = setTimeout(() => setStage(`Releasing ${money(rental.holdCents - fee - extra)}`), 600);
    try {
      await api.settleRental(rental.id, extra, extra > 0 ? note.trim() : undefined);
      if (extra > 0) {
        logStep({ actor: "Owner agent", action: "Damage reported", detail: `${money(extra)}: ${note.trim()}` });
      }
      setMode("idle");
    } catch {
      setFailed(true);
    } finally {
      clearTimeout(t);
      setStage(null);
    }
  }

  const review = rental.damageCheck?.result === "review";
  const settled = rental.status === "settled";
  const charged = rental.capturedCents ?? fee;
  const released = rental.releasedCents ?? rental.holdCents - charged;

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-5 text-heading">Photos</h2>
          {rental.status === "reserved" ? (
            <EmptyState compact title="Not picked up yet" description="Photos appear after pickup." />
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
              <PhotoColumn title="At pickup" photos={rental.pickupPhotos} />
              <PhotoColumn
                title="At return"
                photos={rental.returnPhotos}
                waiting={rental.status === "picked_up" ? "Waiting for the return." : undefined}
              />
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <CheckCard rental={rental} />

          <Card delay={120}>
            {settled ? (
              <>
                <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-5" strokeWidth={2.5} />
                </span>
                <p className="mt-4 text-heading tabular-nums">
                  Charged {money(charged)} · Released {money(released)}
                </p>
                <Link
                  href={`/visit/receipt/${rental.id}`}
                  className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
                >
                  View receipt
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <Row label="Rental fee" hint={`${rental.days} × ${money(rental.dailyFeeCents)}`}>
                    {money(fee)}
                  </Row>
                  <Row label="Deposit" hint="Held, not charged">
                    {money(deposit)}
                  </Row>
                  <Hairline />
                  <Row label="Card hold" strong>
                    {money(rental.holdCents)}
                  </Row>
                </div>

                {rental.status === "returned" && mode === "idle" && (
                  <div className="mt-6 flex flex-col gap-2.5">
                    <Button
                      size="lg"
                      variant={review ? "outline" : "default"}
                      className="w-full"
                      disabled={busy}
                      onClick={() => settle(0)}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="animate-spin" />
                          {stage}
                        </>
                      ) : (
                        <>
                          Settle: charge {money(fee)}, release {money(deposit)}
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant={review ? "default" : "outline"}
                      className="w-full"
                      disabled={busy}
                      onClick={() => setMode("damage")}
                    >
                      Report damage
                    </Button>
                  </div>
                )}

                {rental.status === "returned" && mode === "damage" && (
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="damage-amount" className="text-label text-muted-foreground">
                        Damage charge, up to {money(deposit)}
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="damage-amount"
                          type="number"
                          inputMode="decimal"
                          min={1}
                          max={deposit / 100}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          aria-invalid={extraCents > deposit}
                          className="h-11 pl-7 tabular-nums"
                          placeholder="0"
                        />
                      </div>
                      {extraCents > deposit && (
                        <p className="text-label text-destructive">The most you can charge is {money(deposit)}.</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="damage-note" className="text-label text-muted-foreground">
                        Note for {visitor.firstName}
                      </label>
                      <Textarea
                        id="damage-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        placeholder="Scratch on the left ski tip"
                        className="min-h-20"
                      />
                    </div>
                    {failed && (
                      <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
                        That didn&apos;t go through. Nothing was charged. Try again.
                      </p>
                    )}
                    <div className="flex flex-col gap-2.5">
                      <Button size="lg" className="w-full" disabled={!extraOk || busy} onClick={() => settle(extraCents)}>
                        {busy ? (
                          <>
                            <Loader2 className="animate-spin" />
                            {stage}
                          </>
                        ) : extraOk ? (
                          <>
                            Charge {money(charge)}, release {money(rental.holdCents - charge)}
                          </>
                        ) : (
                          <>Charge damage</>
                        )}
                      </Button>
                      <Button size="lg" variant="outline" className="w-full" disabled={busy} onClick={() => setMode("idle")}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {rental.status === "returned" && mode === "idle" && failed && (
                  <p role="alert" className="mt-4 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
                    That didn&apos;t go through. Nothing was charged. Try again.
                  </p>
                )}

                {rental.status === "picked_up" && (
                  <p className="mt-6 text-sm text-muted-foreground tabular-nums">
                    Due back {when(rental.returnBy)}.
                  </p>
                )}
                {rental.status === "reserved" && (
                  <p className="mt-6 text-sm text-muted-foreground">Waiting for pickup.</p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
