"use client";

/**
 * Shared demo state. Both phones on /demo are same-origin iframes, so this
 * store persists to localStorage and every document re-reads it on the
 * `storage` event. A write on Farhan's phone shows up on Lena's phone (and on
 * the stage) within a frame.
 *
 * Put here only what another phone or another screen must see. Purely local
 * UI (a toggle on one screen) can stay in useState, or use `usePersisted`
 * from ./hooks when it should survive navigating away and back.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PersonaId, PersonId } from "./data/people";
import { EXCHANGE_SCRIPT, EXCHANGE_STEP_MS, type ShareKey } from "./data/seed";

export const STORE_KEY = "rapport-demo-v1";

export type Theme = "dark" | "light";

/**
 * idle       nothing yet
 * requested  initiator's agent asked; waiting for the recipient to accept
 * exchanging agents are talking (progress derived from exchangeStartedAt)
 * matched    exchange finished, both see "It's a match"
 * scheduled  someone tapped "Add to calendar"; both calendars show the coffee
 * declined   recipient said no
 * stopped    either side tapped Stop mid-exchange
 */
export type ConnStatus = "idle" | "requested" | "exchanging" | "matched" | "scheduled" | "declined" | "stopped";

export interface Connection {
  id: string;
  initiator: PersonId;
  recipient: PersonId;
  status: ConnStatus;
  requestedAt?: number;
  exchangeStartedAt?: number;
  stoppedAt?: number;
  matchedAt?: number;
  scheduledAt?: number;
}

/** Stable id for a pair, independent of who started it. */
export function pairId(a: PersonId, b: PersonId) {
  return [a, b].sort().join("~");
}

interface DemoData {
  theme: Theme;
  /** When the demo was (re)started; drives the live recording clock. */
  bootedAt: number;
  connections: Record<string, Connection>;
  share: Record<PersonaId, Record<ShareKey, boolean>>;
  /** Persona-scoped UI state that should survive navigation. Key: `${persona}:${name}`. */
  ui: Record<string, unknown>;
  /** Notification ids a persona has dismissed or opened. */
  seen: Record<string, true>;
}

interface DemoActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  requestConnection: (from: PersonId, to: PersonId) => void;
  acceptConnection: (id: string) => void;
  declineConnection: (id: string) => void;
  stopExchange: (id: string) => void;
  /** Idempotent: called by whichever phone notices the exchange finished. */
  completeExchange: (id: string) => void;
  scheduleMeeting: (id: string) => void;
  toggleShare: (persona: PersonaId, key: ShareKey) => void;
  setUi: (key: string, value: unknown) => void;
  markSeen: (noticeId: string) => void;
  reset: () => void;
}

export type DemoState = DemoData & DemoActions;

const ALL_SHARED: Record<ShareKey, boolean> = { role: true, cv: true, busy: true, project: true };

function initialData(): DemoData {
  return {
    theme: "dark",
    bootedAt: Date.now(),
    connections: {},
    share: { farhan: { ...ALL_SHARED }, lena: { ...ALL_SHARED } },
    ui: {},
    seen: {},
  };
}

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      const patch = (id: string, next: Partial<Connection>) =>
        set((s) => {
          const cur = s.connections[id];
          if (!cur) return s;
          return { connections: { ...s.connections, [id]: { ...cur, ...next } } };
        });

      return {
        ...initialData(),
        setTheme: (theme) => set({ theme }),
        toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
        requestConnection: (from, to) => {
          const id = pairId(from, to);
          const cur = get().connections[id];
          if (cur && cur.status !== "idle" && cur.status !== "declined" && cur.status !== "stopped") return;
          set((s) => ({
            connections: {
              ...s.connections,
              [id]: { id, initiator: from, recipient: to, status: "requested", requestedAt: Date.now() },
            },
          }));
        },
        acceptConnection: (id) => {
          const cur = get().connections[id];
          if (!cur || cur.status !== "requested") return;
          patch(id, { status: "exchanging", exchangeStartedAt: Date.now() });
        },
        declineConnection: (id) => patch(id, { status: "declined" }),
        stopExchange: (id) => patch(id, { status: "stopped", stoppedAt: Date.now() }),
        completeExchange: (id) => {
          const cur = get().connections[id];
          if (!cur || cur.status !== "exchanging") return;
          patch(id, { status: "matched", matchedAt: Date.now() });
        },
        scheduleMeeting: (id) => {
          const cur = get().connections[id];
          if (!cur || (cur.status !== "matched" && cur.status !== "scheduled")) return;
          patch(id, { status: "scheduled", scheduledAt: cur.scheduledAt ?? Date.now() });
        },
        toggleShare: (persona, key) =>
          set((s) => ({
            share: { ...s.share, [persona]: { ...s.share[persona], [key]: !s.share[persona][key] } },
          })),
        setUi: (key, value) => set((s) => ({ ui: { ...s.ui, [key]: value } })),
        markSeen: (noticeId) => set((s) => ({ seen: { ...s.seen, [noticeId]: true } })),
        reset: () => set({ ...initialData(), theme: get().theme }),
      };
    },
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): DemoData => ({
        theme: s.theme,
        bootedAt: s.bootedAt,
        connections: s.connections,
        share: s.share,
        ui: s.ui,
        seen: s.seen,
      }),
    },
  ),
);

/** Re-read the store when another phone (or the stage) writes it. Call once per document. */
export function syncAcrossFrames() {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORE_KEY) void useDemo.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/* ---------- Derived helpers (pure) ---------- */

export const EXCHANGE_TOTAL = EXCHANGE_SCRIPT.length;

/** How many exchange messages are visible at `now`. */
export function exchangeStep(conn: Connection | undefined, now: number): number {
  if (!conn) return 0;
  if (conn.status === "matched" || conn.status === "scheduled") return EXCHANGE_TOTAL;
  if (conn.status !== "exchanging" && conn.status !== "stopped") return 0;
  if (!conn.exchangeStartedAt) return 0;
  const end = conn.status === "stopped" ? (conn.stoppedAt ?? now) : now;
  // First message lands right after accept, then one every EXCHANGE_STEP_MS.
  const n = Math.floor((end - conn.exchangeStartedAt) / EXCHANGE_STEP_MS) + 1;
  return Math.max(0, Math.min(EXCHANGE_TOTAL, n));
}
