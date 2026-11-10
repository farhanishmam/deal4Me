"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Check, ChevronRight, History, SquarePen, Sparkles } from "lucide-react";
import { ChatBubble } from "@/components/shared/ChatBubble";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/visitor/i18n";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AgentResultCard } from "./AgentCards";
import { useChat, useChatsReady } from "./chatStore";
import type { ChatMessage } from "./chatStore";
import { agentStrings } from "./strings";

const NONE: ChatMessage[] = [];

const ROW =
  "min-h-12 rounded-xl bg-muted/60 px-4 py-3 text-left text-[15px] transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15 active:scale-[0.99]";

/** The visitor's own agent: glacier sparkle. */
function Avatar() {
  return (
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-info text-white" aria-hidden>
      <Sparkles className="size-4" strokeWidth={2.25} />
    </span>
  );
}

function Typing({ phases }: { phases: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, phases.length - 1)), 600);
    return () => clearInterval(id);
  }, [phases.length]);
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Avatar />
      <div className="flex min-w-0 items-center gap-3 rounded-2xl rounded-bl-md bg-muted px-4 py-2.5" role="status" aria-live="polite">
          <span className="flex shrink-0 items-center gap-1" aria-hidden>
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
          <span className="min-w-0 text-[13px] leading-snug text-muted-foreground">
            {phases[i]}
          </span>
      </div>
    </div>
  );
}

function WhatIDid({ steps, label }: { steps: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1 rounded-md px-1 text-[14px] font-semibold text-info transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        {label}
        <ChevronRight className={cn("size-3.5 transition-transform duration-150", open ? "-rotate-90" : "rotate-90")} aria-hidden />
      </button>
      {open && (
        <ul className="mt-1 flex animate-rise flex-col gap-2 self-stretch pb-1">
          {steps.map((step) => (
            <li key={step} className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.5} aria-hidden />
              {step}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Message({
  m,
  label,
  retry,
  onRetry,
}: {
  m: ChatMessage;
  label: { did: string; retry: string; errorText: string };
  retry: boolean;
  onRetry: (text: string) => void;
}) {
  if (m.role === "user") {
    return <ChatBubble side="right">{m.text}</ChatBubble>;
  }
  if (m.role === "error") {
    return (
      <div className="flex items-start gap-2">
        <Avatar />
        <ChatBubble>
          <span className="flex flex-col items-start gap-2">
            {m.text || label.errorText}
            {retry && (
              <Button size="sm" variant="outline" onClick={() => onRetry(m.retryText)}>
                {label.retry}
              </Button>
            )}
          </span>
        </ChatBubble>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Avatar />
        <ChatBubble>{m.text}</ChatBubble>
      </div>
      {m.cards.length > 0 && (
        <div className="flex flex-col gap-2">
          {m.cards.map((c, i) => (
            <AgentResultCard key={`${c.itemId}-${c.title}`} card={c} first={i === 0} />
          ))}
        </div>
      )}
      <WhatIDid steps={m.steps} label={label.did} />
    </div>
  );
}

const ICON_BUTTON =
  "flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-35";

export function AgentChat() {
  const { lang } = useT();
  const s = agentStrings(lang);
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const c = params.get("c")?.trim() ?? "";
  const hydrated = useHydrated();
  const ready = useChatsReady();
  const activeId = useChat((st) => st.activeId);
  const messages = useChat((st) => st.conversations.find((x) => x.id === st.activeId)?.messages) ?? NONE;
  const pending = useChat((st) => st.activeId !== null && st.pendingIds.includes(st.activeId));
  const send = useChat((st) => st.send);
  const open = useChat((st) => st.open);
  const newChat = useChat((st) => st.newChat);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const lastRef = useRef<HTMLDivElement>(null);
  const sentQ = useRef<string | null>(null);

  const last = messages[messages.length - 1];
  const empty = messages.length === 0 && !pending;

  // A tap on "Find it for me" arrives with ?q=. Send it once in a new chat, then clear it from the URL.
  useEffect(() => {
    if (!q || !ready || !hydrated || sentQ.current === q) return;
    sentQ.current = q;
    void send(q, { fresh: true });
    router.replace("/visit/agent", { scroll: false });
  }, [q, ready, hydrated, send, router]);

  // A saved chat opens with ?c=<id>. An id that no longer exists just shows the current chat.
  useEffect(() => {
    if (!c || !ready) return;
    open(c);
    router.replace("/visit/agent", { scroll: false });
  }, [c, ready, open, router]);

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    if (last?.role === "agent" && lastRef.current) {
      box.scrollTo({ top: Math.max(0, lastRef.current.offsetTop - 16), behavior: "smooth" });
    } else {
      box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, pending, last?.role]);

  // Switching chats starts at the end of the new one.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [activeId, ready]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    void send(text);
  }

  const showEmpty = ready && empty && !q && !c;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <ScreenHeader
        title={s.title}
        backHref="/visit/home"
        aside={
          <div className="-mr-2 flex items-center">
            <Link href="/visit/chats" aria-label={s.history} className={ICON_BUTTON}>
              <History className="size-[20px]" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => {
                newChat();
                setDraft("");
              }}
              disabled={empty}
              aria-label={s.newChat}
              className={ICON_BUTTON}
            >
              <SquarePen className="size-[20px]" aria-hidden />
            </button>
          </div>
        }
      />

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showEmpty ? (
          <div className="flex min-h-full flex-col justify-center gap-6 px-4 py-8">
            <p className="animate-rise text-[28px] leading-tight font-bold tracking-[-0.02em]">{s.empty}</p>
            <div className="flex animate-rise flex-col items-stretch gap-2 [animation-delay:80ms]">
              {s.chips.map((chip) => (
                <button key={chip} type="button" onClick={() => void send(chip)} className={ROW}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : !ready ? null : (
          <div className="flex flex-col gap-4 px-4 pt-3 pb-2">
            {messages.map((m, i) => (
              <div key={m.id} ref={i === messages.length - 1 ? lastRef : undefined}>
                <Message
                  m={m}
                  label={s}
                  retry={i === messages.length - 1 && !pending}
                  onRetry={(text) => void send(text)}
                />
              </div>
            ))}
            {pending && <Typing phases={s.phases} />}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={s.placeholder}
          aria-label={s.placeholder}
          enterKeyHint="send"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 text-[15px] transition-colors duration-150 outline-none placeholder:text-muted-foreground/70 focus-visible:border-info/60 focus-visible:ring-3 focus-visible:ring-info/20"
        />
        <button
          type="submit"
          aria-label={s.send}
          disabled={!draft.trim() || pending}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-info text-white transition-opacity duration-150 outline-none focus-visible:ring-3 focus-visible:ring-info/30 disabled:opacity-40"
        >
          <ArrowUp className="size-5" strokeWidth={2.25} />
        </button>
      </form>
    </div>
  );
}
