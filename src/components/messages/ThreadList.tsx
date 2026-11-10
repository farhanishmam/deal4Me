"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useThreads, type MessageRole } from "@/lib/messages";
import { thumbFor } from "@/lib/photos";
import { useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { dailyPrice, partyName, relativeTime, useCopy } from "./copy";

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Every agreed deal as a conversation, newest first. */
export function ThreadList({ role, shopId }: { role: MessageRole; shopId?: string }) {
  const { t, tongue } = useCopy(role);
  const hydrated = useHydrated();
  const visitorName = useStore((s) => s.visitor.firstName);
  const threads = useThreads(role, shopId);
  const now = useNow();

  const base = role === "buyer" ? "/visit/messages" : "/seller/messages";

  return (
    <div className="flex min-h-full flex-col bg-card">
      <header className="shrink-0 px-5 pt-3 pb-2">
        <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.022em]">{t.title}</h1>
      </header>

      {!hydrated ? (
        <p role="status" className="px-5 py-8 text-sm text-muted-foreground">
          {t.loading}
        </p>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title={t.emptyTitle}
          action={
            <Link
              href={role === "buyer" ? "/visit/home" : "/seller/listings"}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {role === "buyer" ? t.emptyBuyer : t.emptySeller}
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-1.5 px-3 pb-4">
          {threads.map((th) => {
            const name = partyName(role, th.shop, visitorName, t);
            const itemLine = [th.item?.name?.trim(), dailyPrice(th.negotiation, tongue)].filter(Boolean).join(" · ");
            const preview = th.last ? `${th.last.from === role ? t.you : ""}${th.last.text}` : t.noMessages;
            const unread = th.unread > 0;
            return (
              <li key={th.id}>
                <Link
                  href={`${base}/${th.id}`}
                  aria-label={unread ? `${name}, ${t.unread}` : undefined}
                  className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3 outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={th.item ? thumbFor(th.item) : "/brand/no-photo.svg"}
                    alt=""
                    className="size-12 shrink-0 rounded-xl bg-card object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className={cn("min-w-0 flex-1 truncate text-[15px] tracking-[-0.01em]", unread ? "font-bold" : "font-semibold")}>
                        {name}
                      </p>
                      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                        {relativeTime(th.last?.at, t, now)}
                      </span>
                    </div>
                    <p className="truncate text-[13px] text-muted-foreground">{itemLine}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={cn("min-w-0 flex-1 truncate text-[13px]", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {preview}
                      </p>
                      {unread && <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
