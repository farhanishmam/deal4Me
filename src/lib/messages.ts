"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useStore } from "./store";
import type { Item, Negotiation, Shop } from "./types";

// Buyer and seller messages. A thread opens once a deal is agreed, and its id is
// that negotiation's id. The server keeps them so another device sees them; this
// browser keeps a copy, and lastRead stays local because it belongs to one person.

export type MessageRole = "buyer" | "seller";

export interface ThreadMessage {
  id: string;
  from: MessageRole;
  text: string;
  at: string;
  /** Set while the server has not accepted this message yet. It keeps retrying. */
  failed?: boolean;
}

export interface ThreadSummary {
  id: string;
  negotiation: Negotiation;
  item?: Item;
  shop?: Shop;
  last?: ThreadMessage;
  unread: number;
}

export const MESSAGES_KEY = "deal4me-messages";

interface MessagesState {
  threads: Record<string, ThreadMessage[]>;
  lastRead: Record<string, string>;
  send: (threadId: string, from: MessageRole, text: string) => void;
  markRead: (threadId: string, role: MessageRole) => void;
  /** Merge the server's threads in by message id. */
  loadFromServer: () => Promise<void>;
  /** Post again every message the server does not have. */
  flush: () => void;
}

let counter = 0;
const newId = () => `msg-${Date.now().toString(36)}-${(++counter).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const inFlight = new Set<string>();
const RETRY_MS = [2000, 5000, 10000, 20000];

const byTime = (a: ThreadMessage, b: ThreadMessage) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id);

async function post(threadId: string, message: ThreadMessage): Promise<ThreadMessage> {
  const res = await fetch("/api/data/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, from: message.from, text: message.text, clientId: message.id }),
  });
  if (!res.ok) throw new Error(`Message not saved (${res.status})`);
  return (await res.json()) as ThreadMessage;
}

export const useMessages = create<MessagesState>()(
  persist(
    (set, get) => {
      /** Send one message to the server. On failure mark it failed, then try again later. */
      const deliver = async (threadId: string, message: ThreadMessage, attempt = 0): Promise<void> => {
        if (inFlight.has(message.id)) return;
        inFlight.add(message.id);
        try {
          const saved = await post(threadId, message);
          set((s) => ({
            threads: {
              ...s.threads,
              [threadId]: (s.threads[threadId] ?? [])
                .map((m) => (m.id === message.id ? { id: saved.id, from: saved.from, text: saved.text, at: saved.at } : m))
                .sort(byTime),
            },
          }));
        } catch {
          set((s) => ({
            threads: {
              ...s.threads,
              [threadId]: (s.threads[threadId] ?? []).map((m) => (m.id === message.id ? { ...m, failed: true } : m)),
            },
          }));
          if (attempt < RETRY_MS.length) {
            setTimeout(() => {
              const current = get().threads[threadId]?.find((m) => m.id === message.id);
              if (current?.failed) void deliver(threadId, current, attempt + 1);
            }, RETRY_MS[attempt]);
          }
        } finally {
          inFlight.delete(message.id);
        }
      };

      return {
        threads: {},
        lastRead: {},
        send: (threadId, from, raw) => {
          const text = raw.trim();
          if (!text) return;
          const message: ThreadMessage = { id: newId(), from, text, at: new Date().toISOString() };
          set((s) => ({
            threads: { ...s.threads, [threadId]: [...(s.threads[threadId] ?? []), message] },
            lastRead: { ...s.lastRead, [`${from}:${threadId}`]: message.at },
          }));
          void deliver(threadId, message);
        },
        markRead: (threadId, role) =>
          set((s) => {
            const newest = s.threads[threadId]?.at(-1)?.at ?? "";
            const now = new Date().toISOString();
            return { lastRead: { ...s.lastRead, [`${role}:${threadId}`]: newest > now ? newest : now } };
          }),
        loadFromServer: async () => {
          const res = await fetch("/api/data/messages", { cache: "no-store" });
          if (!res.ok) throw new Error(`Could not load messages (${res.status})`);
          const body = (await res.json()) as { threads?: Record<string, ThreadMessage[]> };
          const server = body.threads ?? {};
          set((s) => {
            let changed = false;
            const threads = { ...s.threads };
            for (const [id, remote] of Object.entries(server)) {
              const local = threads[id] ?? [];
              const known = new Map(local.map((m) => [m.id, m]));
              const merged = new Map<string, ThreadMessage>(known);
              for (const m of remote) {
                const mine = known.get(m.id);
                if (!mine || mine.failed || mine.at !== m.at || mine.text !== m.text) {
                  merged.set(m.id, { id: m.id, from: m.from, text: m.text, at: m.at });
                }
              }
              const next = [...merged.values()].sort(byTime);
              if (next.length !== local.length || next.some((m, i) => m !== local[i])) {
                threads[id] = next;
                changed = true;
              }
            }
            return changed ? { threads } : s;
          });
          // Anything we hold that the server lacks never arrived (for example the tab closed mid-send).
          for (const [id, local] of Object.entries(get().threads)) {
            const have = new Set((server[id] ?? []).map((m) => m.id));
            for (const m of local) if (!have.has(m.id) && !inFlight.has(m.id)) void deliver(id, m);
          }
        },
        flush: () => {
          for (const [id, local] of Object.entries(get().threads)) {
            for (const m of local) if (m.failed && !inFlight.has(m.id)) void deliver(id, m);
          }
        },
      };
    },
    {
      name: MESSAGES_KEY,
      storage: createJSONStorage(() => localStorage),
      // MessagesSync rehydrates on mount, so the server and first client render match.
      skipHydration: true,
    },
  ),
);

const dealTime = (n: Negotiation) => n.rounds.at(-1)?.at ?? "";

/** Threads for one profile, newest first. Each item shows one thread: its latest deal, or the deal already being discussed. */
export function useThreads(role: MessageRole, shopId?: string): ThreadSummary[] {
  const negotiations = useStore((s) => s.negotiations);
  const items = useStore((s) => s.items);
  const shops = useStore((s) => s.shops);
  const threads = useMessages((s) => s.threads);
  const lastRead = useMessages((s) => s.lastRead);

  return useMemo(() => {
    // The newest deal per item, plus every deal that already has messages, de-duplicated by id.
    const newest = new Map<string, Negotiation>();
    for (const n of negotiations) {
      if (n.status !== "deal") continue;
      const kept = newest.get(n.itemId);
      if (!kept || dealTime(n) > dealTime(kept)) newest.set(n.itemId, n);
    }
    const byId = new Map<string, Negotiation>();
    for (const n of negotiations) {
      if (n.status === "deal" && (threads[n.id]?.length ?? 0) > 0) byId.set(n.id, n);
    }
    for (const n of newest.values()) byId.set(n.id, n);

    const other: MessageRole = role === "buyer" ? "seller" : "buyer";
    return [...byId.values()]
      .map((negotiation): ThreadSummary => {
        const item = items.find((i) => i.id === negotiation.itemId);
        const messages = threads[negotiation.id] ?? [];
        const read = lastRead[`${role}:${negotiation.id}`] ?? "";
        return {
          id: negotiation.id,
          negotiation,
          item,
          shop: shops.find((x) => x.id === item?.shopId),
          last: messages.at(-1),
          unread: messages.filter((m) => m.from === other && m.at > read).length,
        };
      })
      .filter((t) => !shopId || t.item?.shopId === shopId)
      .sort((a, b) => (b.last?.at ?? dealTime(b.negotiation)).localeCompare(a.last?.at ?? dealTime(a.negotiation)));
  }, [negotiations, items, shops, threads, lastRead, role, shopId]);
}

export function useUnreadCount(role: MessageRole, shopId?: string): number {
  return useThreads(role, shopId).reduce((sum, t) => sum + t.unread, 0);
}
