"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { AgentCard } from "@/lib/types";
import { agentStrings } from "./strings";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "agent"; text: string; cards: AgentCard[]; steps: string[] }
  /** An empty text means "show the standard failure line in the reader's language". */
  | { id: string; role: "error"; text: string; retryText: string };

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  /** The conversation on screen. Null means a new chat that has no message yet. */
  activeId: string | null;
  /** Conversations waiting for the agent. Never saved, so a reload cannot leave one stuck. */
  pendingIds: string[];
  send: (text: string, options?: { fresh?: boolean }) => Promise<void>;
  open: (id: string) => boolean;
  newChat: () => void;
  /** Merge the chats saved on the server in. The newer copy of each conversation wins. */
  loadFromServer: () => Promise<void>;
}

const STORAGE_KEY = "deal4me-chats";
const MAX_CONVERSATIONS = 50;
const TITLE_LIMIT = 60;

let counter = 0;
const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}${++counter}`;

/** "$250 max" or "250ドル" in the message becomes this trip's budget for the ask. */
function budgetFrom(text: string): number | undefined {
  const m = text.match(/\$\s?(\d{2,5})/) ?? text.match(/(\d{2,5})\s?(?:ドル|dollars?|usd)/i);
  return m ? Number(m[1]) * 100 : undefined;
}

function titleFrom(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > TITLE_LIMIT ? `${flat.slice(0, TITLE_LIMIT - 1).trimEnd()}…` : flat;
}

/** Add messages to one conversation and move it to the top of the list. */
function withMessages(
  list: Conversation[],
  id: string,
  update: (messages: ChatMessage[]) => ChatMessage[],
): Conversation[] {
  const current = list.find((c) => c.id === id);
  if (!current) return list;
  const next: Conversation = { ...current, messages: update(current.messages), updatedAt: Date.now() };
  return [next, ...list.filter((c) => c.id !== id)];
}

/**
 * A request that was in flight when the page closed has no reply to wait for any more.
 * Turn it into a retry line instead of leaving the chat looking like it is still typing.
 */
function settle(c: Conversation): Conversation {
  const last = c.messages[c.messages.length - 1];
  if (!last || last.role !== "user") return c;
  return {
    ...c,
    messages: [...c.messages, { id: nextId("m"), role: "error", text: "", retryText: last.text }],
  };
}

export const useChat = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      pendingIds: [],

      send: async (raw, options) => {
        const text = raw.trim();
        if (!text) return;
        let id = options?.fresh ? null : get().activeId;
        if (id && get().pendingIds.includes(id)) return;
        if (id && !get().conversations.some((c) => c.id === id)) id = null;
        const convId = id ?? nextId("c");
        const userMessage: ChatMessage = { id: nextId("m"), role: "user", text };

        set((s) => {
          const base = s.conversations.some((c) => c.id === convId)
            ? withMessages(s.conversations, convId, (ms) => [...ms.filter((m) => m.role !== "error"), userMessage])
            : [
                { id: convId, title: titleFrom(text), messages: [userMessage], updatedAt: Date.now() },
                ...s.conversations,
              ].slice(0, MAX_CONVERSATIONS);
          return { conversations: base, activeId: convId, pendingIds: [...s.pendingIds, convId] };
        });

        const visitor = useStore.getState().visitor;
        const budget = budgetFrom(text);
        const done = (message: ChatMessage) =>
          set((s) => ({
            conversations: withMessages(s.conversations, convId, (ms) => [...ms, message]),
            pendingIds: s.pendingIds.filter((p) => p !== convId),
          }));
        try {
          const res = await api.askVisitorAgent(text, budget ? { ...visitor, budgetCents: budget } : visitor);
          done({ id: nextId("m"), role: "agent", text: res.reply, cards: res.cards, steps: res.steps });
        } catch (error) {
          done({
            id: nextId("m"),
            role: "error",
            text: error instanceof Error && error.message ? error.message : agentStrings(visitor.language).errorText,
            retryText: text,
          });
        }
      },

      open: (id) => {
        if (!get().conversations.some((c) => c.id === id)) return false;
        set({ activeId: id });
        return true;
      },

      newChat: () => set({ activeId: null }),

      loadFromServer: async () => {
        const res = await fetch("/api/data/chats", { cache: "no-store" });
        if (!res.ok) throw new Error(`Could not load chats (${res.status})`);
        const body = (await res.json()) as { chats?: Conversation[] };
        const remote = Array.isArray(body.chats) ? body.chats : [];
        set((s) => {
          const merged = new Map(s.conversations.map((c) => [c.id, c]));
          for (const r of remote) {
            const mine = merged.get(r.id);
            if (mine && (mine.updatedAt >= r.updatedAt || s.pendingIds.includes(r.id))) {
              if (mine.updatedAt === r.updatedAt) saved.set(mine.id, mine);
              continue;
            }
            // A reply that was still coming on the other device will not arrive here.
            const copy = settle(r);
            saved.set(copy.id, copy);
            merged.set(r.id, copy);
          }
          const conversations = [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
          return { conversations };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Read on mount, so the server render and the first client render match.
      skipHydration: true,
      partialize: (s) => ({ conversations: s.conversations, activeId: s.activeId }),
      merge: (saved, current) => {
        const s = saved as Partial<Pick<ChatState, "conversations" | "activeId">> | undefined;
        const conversations = Array.isArray(s?.conversations) ? s.conversations.map(settle) : current.conversations;
        const activeId = conversations.some((c) => c.id === s?.activeId) ? (s?.activeId ?? null) : null;
        return { ...current, conversations, activeId };
      },
    },
  ),
);

/** The copy of each conversation the server already has, so only changes are sent. */
const saved = new Map<string, Conversation>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DELAY_MS = 400;

async function saveChat(chat: Conversation, attempt = 0): Promise<void> {
  try {
    const res = await fetch("/api/data/chats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat }),
    });
    if (!res.ok) throw new Error(`Chat not saved (${res.status})`);
  } catch {
    // Keep the local copy, and try again a few times. A later change saves it anyway.
    if (attempt < 3) {
      saved.delete(chat.id);
      setTimeout(() => {
        const latest = useChat.getState().conversations.find((c) => c.id === chat.id);
        if (latest && saved.get(latest.id) !== latest) {
          saved.set(latest.id, latest);
          void saveChat(latest, attempt + 1);
        }
      }, 3000 * (attempt + 1));
    }
  }
}

let started = false;
/** Watches the store and saves each conversation to the server shortly after it changes. */
function startSaving() {
  if (started || typeof window === "undefined") return;
  started = true;
  useChat.subscribe((state) => {
    for (const c of state.conversations) {
      if (saved.get(c.id) === c) continue;
      clearTimeout(saveTimers.get(c.id));
      saveTimers.set(
        c.id,
        setTimeout(() => {
          saveTimers.delete(c.id);
          const latest = useChat.getState().conversations.find((x) => x.id === c.id);
          if (!latest || saved.get(latest.id) === latest) return;
          saved.set(latest.id, latest);
          void saveChat(latest);
        }, SAVE_DELAY_MS),
      );
    }
  });
}

let loadedFromServer = false;

/** Merge the server's chats once, and only then start saving, so an old local copy never overwrites a newer one. */
function connectToServer() {
  if (loadedFromServer || typeof window === "undefined") return;
  loadedFromServer = true;
  useChat
    .getState()
    .loadFromServer()
    .catch(() => { loadedFromServer = false; })
    .finally(startSaving);
}

/** Loads the saved chats once, in the browser. Returns true when they are ready to show. */
export function useChatsReady(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const off = useChat.persist.onFinishHydration(() => {
        onChange();
        connectToServer();
      });
      if (!useChat.persist.hasHydrated()) void useChat.persist.rehydrate();
      else connectToServer();
      return off;
    },
    () => useChat.persist.hasHydrated(),
    () => false,
  );
}
