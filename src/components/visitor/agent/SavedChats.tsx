"use client";

import Link from "next/link";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useT } from "@/components/visitor/i18n";
import { money } from "@/lib/format";
import { useHydrated, useStore } from "@/lib/store";
import type { Lang, Negotiation } from "@/lib/types";
import { useChat, useChatsReady } from "./chatStore";
import type { Conversation } from "./chatStore";
import { agentStrings } from "./strings";
import type { AgentStrings } from "./strings";

interface Row {
  key: string;
  href: string;
  title: string;
  line: string;
  at: number;
}

const LOCALES: Partial<Record<Lang, string>> = { en: "en-US", ja: "ja-JP" };

/** "3 hours ago", "yesterday", or a short date once it is a week old. */
function ago(at: number, lang: Lang, s: AgentStrings): string {
  if (!at) return "";
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return s.now;
  const locale = LOCALES[lang] ?? "en-US";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 7 * 86400) return rtf.format(-Math.floor(seconds / 86400), "day");
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(at);
}

function lastLine(c: Conversation, s: AgentStrings): string {
  const last = c.messages[c.messages.length - 1];
  if (!last) return "";
  return last.role === "error" ? last.text || s.errorText : last.text;
}

function negotiationTime(n: Negotiation): number {
  const stamps = n.rounds.map((r) => Date.parse(r.at)).filter((t) => Number.isFinite(t));
  return stamps.length ? Math.max(...stamps) : 0;
}

function negotiationLine(n: Negotiation, s: AgentStrings): string {
  if (n.status === "no_deal") return s.noDeal;
  if (n.status === "running") return s.inProgress;
  const lastOwner = [...n.rounds].reverse().find((r) => r.by === "owner");
  const price = n.agreedDailyCents ?? lastOwner?.offerCents;
  return price === undefined ? s.inProgress : s.dealAt(money(price));
}

export function SavedChats() {
  const { lang } = useT();
  const s = agentStrings(lang);
  const ready = useChatsReady();
  const hydrated = useHydrated();
  const conversations = useChat((st) => st.conversations);
  const negotiations = useStore((st) => st.negotiations);
  const items = useStore((st) => st.items);

  const rows: Row[] = [
    ...conversations.map((c) => ({
      key: c.id,
      href: `/visit/agent?c=${encodeURIComponent(c.id)}`,
      title: c.title,
      line: lastLine(c, s),
      at: c.updatedAt,
    })),
    ...negotiations.map((n) => ({
      key: n.id,
      href: `/visit/negotiate/${encodeURIComponent(n.itemId)}?negotiation=${encodeURIComponent(n.id)}&days=${n.days}`,
      title: items.find((i) => i.id === n.itemId)?.name || s.unnamedItem,
      line: negotiationLine(n, s),
      at: negotiationTime(n),
    })),
  ].sort((a, b) => b.at - a.at);

  // Chats load from this phone and negotiations from the server; wait for both.
  const loaded = ready && hydrated;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <ScreenHeader title={s.savedTitle} backHref="/visit/agent" />
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!loaded ? null : rows.length === 0 ? (
          <p className="animate-rise px-4 pt-10 text-center text-[15px] text-muted-foreground">{s.savedEmpty}</p>
        ) : (
          <ul className="animate-rise divide-y divide-border px-4">
            {rows.map((r) => (
              <li key={r.key}>
                <Link
                  href={r.href}
                  className="flex min-h-16 items-center gap-3 py-3 outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/15 active:opacity-70"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{r.title}</span>
                    {r.line && <span className="truncate text-[13px] text-muted-foreground">{r.line}</span>}
                  </span>
                  <span className="shrink-0 self-start pt-1 text-[12px] text-muted-foreground tabular-nums">
                    {ago(r.at, lang, s)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
