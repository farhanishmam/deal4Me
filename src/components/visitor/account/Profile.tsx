"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, ChevronRight, User } from "lucide-react";
import { fromZonedInput, toZonedInput } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useC } from "./copy";
import type { CopyKey } from "./copy";

const GROUP = "divide-y divide-border/70 overflow-hidden rounded-xl bg-muted/60";
const ROW = "flex min-h-14 items-center gap-3 px-4 text-[17px]";
const LANGS: { code: Lang; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
];

/** The Salt Lake calendar day of an ISO time, as a date input value. */
function localDate(value: string): string {
  return toZonedInput(value).slice(0, 10);
}

/** 9:00 AM Salt Lake time on the chosen day. */
const dayStart = (day: string) => (day ? fromZonedInput(`${day}T09:00`) ?? "" : "");

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(ROW, "font-medium outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted")}
    >
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function Profile() {
  const { lang, c } = useC();
  const firstName = useStore((s) => s.visitor.firstName);
  const preferredSize = useStore((s) => s.visitor.preferredSize ?? "");
  const tripStart = useStore((s) => s.visitor.tripStart);
  const tripEnd = useStore((s) => s.visitor.tripEnd);
  const setVisitor = useStore((s) => s.setVisitor);
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? firstName;
  const initial = firstName.trim().charAt(0).toUpperCase();

  function commit(value: string) {
    const next = value.trim();
    if (next !== firstName) setVisitor({ firstName: next });
    setDraft(null);
  }

  return (
    <div className="flex min-h-full flex-col bg-card px-4 pb-6">
      <h1 className="flex h-12 shrink-0 items-center text-[20px] font-bold tracking-[-0.018em]">{c("profile.title")}</h1>

      <div className="mt-2 flex animate-rise items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink text-[26px] font-semibold text-ink-foreground">
          {initial || <User className="size-7" strokeWidth={1.75} />}
        </span>
        <input
          value={name}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={40}
          autoComplete="given-name"
          aria-label={c("profile.name")}
          placeholder={c("profile.addName")}
          className="h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 -mx-3 text-[22px] font-bold tracking-[-0.018em] outline-none transition-colors duration-150 placeholder:font-medium placeholder:text-muted-foreground hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-primary/15"
        />
      </div>

      <div className="mt-8 flex animate-rise flex-col gap-3 [animation-delay:60ms]">
        <div className={GROUP}>
          <div className={ROW}>
            <span className="flex-1 font-medium">{c("profile.language")}</span>
            <div role="radiogroup" aria-label={c("profile.language")} className="flex gap-1.5">
              {LANGS.map((l) => {
                const on = l.code === lang;
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setVisitor({ language: l.code })}
                    className={cn(
                      "h-9 rounded-full px-3.5 text-[15px] font-semibold outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/15",
                      on ? "bg-info-soft text-info" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex flex-col gap-1.5 px-4 py-3 text-[15px]"><span className="font-medium">{lang === "ja" ? "服・スキーのサイズ" : "Clothing or ski size"}</span><input aria-label="Preferred clothing or ski size" value={preferredSize} onChange={(event) => setVisitor({ preferredSize: event.target.value })} maxLength={80} placeholder="M, boot 26.5, skis 170 cm" className="h-11 rounded-lg border border-border bg-card px-3 outline-none focus-visible:ring-3 focus-visible:ring-primary/15" /></label>
          <label className="flex flex-col gap-1.5 px-4 py-3 text-[15px]"><span className="font-medium">{lang === "ja" ? "利用開始日" : "When you need it"}</span><input type="date" aria-label="Preferred start date" value={localDate(tripStart)} onChange={(event) => setVisitor({ tripStart: dayStart(event.target.value) })} className="h-11 rounded-lg border border-border bg-card px-3" /></label>
          <label className="flex flex-col gap-1.5 px-4 py-3 text-[15px]"><span className="font-medium">{lang === "ja" ? "利用終了日" : "Until"}</span><input type="date" aria-label="Preferred end date" value={localDate(tripEnd)} min={localDate(tripStart)} onChange={(event) => setVisitor({ tripEnd: dayStart(event.target.value) })} className="h-11 rounded-lg border border-border bg-card px-3" /></label>
        </div>

        <div className={GROUP}>
          <LinkRow href="/visit/trips" label={c("profile.bookings")} />
          <LinkRow href="/visit/chats" label={c("profile.chats")} />
        </div>
      </div>

      <Link
        href="/seller"
        className="mt-auto flex h-12 shrink-0 animate-rise items-center justify-center gap-2 rounded-xl border border-border pt-0 text-[17px] font-semibold outline-none transition-colors duration-150 [animation-delay:120ms] hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        <ArrowLeftRight className="size-5" strokeWidth={2} />
        {c("profile.switch" as CopyKey)}
      </Link>
    </div>
  );
}
