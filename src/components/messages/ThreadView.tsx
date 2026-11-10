"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { clockTime } from "@/lib/format";
import { useMessages, useThreads, type MessageRole } from "@/lib/messages";
import { thumbFor } from "@/lib/photos";
import { selectSellerShop, useSellerShop } from "@/lib/seller";
import { useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { dailyPrice, dealLine, partyName, useCopy } from "./copy";

const EMPTY: never[] = [];

/** One agreed deal as a conversation between the buyer and the seller. Nothing here replies on its own. */
export function ThreadView({ threadId, role }: { threadId: string; role: MessageRole }) {
  const { t, tongue } = useCopy(role);
  const hydrated = useHydrated();
  const visitorName = useStore((s) => s.visitor.firstName);
  const threads = useThreads(role);
  const thread = threads.find((x) => x.id === threadId);

  const messages = useMessages((s) => s.threads[threadId]) ?? EMPTY;
  const send = useMessages((s) => s.send);
  const markRead = useMessages((s) => s.markRead);

  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const found = Boolean(thread);

  // A direct link can point at a deal on another store; switch the seller phone to it.
  const dealShopId = useStore((s) => {
    const itemId = s.negotiations.find((n) => n.id === threadId && n.status === "deal")?.itemId;
    return s.items.find((i) => i.id === itemId)?.shopId;
  });
  const managedShopId = useSellerShop().shop?.id;
  useEffect(() => {
    if (role === "seller" && dealShopId && dealShopId !== managedShopId) selectSellerShop(dealShopId);
  }, [role, dealShopId, managedShopId]);
  const lastId = messages.at(-1)?.id;

  // Mark read when the thread opens and whenever something new arrives while it is open.
  useEffect(() => {
    if (found) markRead(threadId, role);
  }, [found, threadId, role, lastId, markRead]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [found, lastId]);

  const listHref = role === "buyer" ? "/visit/messages" : "/seller/messages";

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-card">
        <ScreenHeader title={t.title} backHref={listHref} />
        <p role="status" className="px-5 py-8 text-sm text-muted-foreground">
          {t.loading}
        </p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-card">
        <ScreenHeader title={t.title} backHref={listHref} />
        <EmptyState
          icon={<MessageCircle />}
          title={t.notFoundTitle}
          description={t.notFoundBody}
          action={
            <Link href={listHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
              {t.backToMessages}
            </Link>
          }
        />
      </div>
    );
  }

  const name = partyName(role, thread.shop, visitorName, t);

  const submit = () => {
    if (!draft.trim()) return;
    send(threadId, role, draft);
    setDraft("");
    input.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <ScreenHeader title={name} backHref={listHref} />

      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-5 pt-1 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thread.item ? thumbFor(thread.item) : "/brand/no-photo.svg"}
          alt=""
          className="size-10 shrink-0 rounded-lg bg-muted object-cover"
        />
        <div className="min-w-0">
          {thread.item?.name?.trim() && <p className="truncate text-[14px] font-semibold">{thread.item.name.trim()}</p>}
          <p className="truncate text-[13px] text-muted-foreground">{dealLine(thread.negotiation, tongue)}</p>
        </div>
      </div>

      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <p className="pb-2 text-center text-[13px] text-muted-foreground">
          {t.agreed(dailyPrice(thread.negotiation, tongue))}
        </p>
        {messages.map((m) => {
          const own = m.from === role;
          return (
            <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
              <p
                title={clockTime(m.at)}
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap",
                  own ? "rounded-br-md bg-info-soft" : "rounded-bl-md bg-muted",
                )}
              >
                {m.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-card px-4 py-3">
        <input
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          enterKeyHint="send"
          autoComplete="off"
          aria-label={t.placeholder}
          placeholder={t.placeholder}
          className="h-11 min-w-0 flex-1 rounded-full bg-muted/60 px-4 text-[16px] outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          aria-label={t.send}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-[opacity,transform] duration-150 hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-primary/25 active:scale-95 disabled:opacity-35"
        >
          <ArrowUp className="size-5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
