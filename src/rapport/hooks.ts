"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { counterpart, isPersona, PEOPLE, type Person, type PersonaId, type PersonId } from "./data/people";
import { exchangeStep, EXCHANGE_TOTAL, pairId, useDemo, type Connection } from "./store";

/** The phone owner, from /rapport/[persona]/... Falls back to Farhan. */
export function usePersonaId(): PersonaId {
  const params = useParams<{ persona?: string }>();
  const raw = params?.persona ?? "farhan";
  return isPersona(raw) ? raw : "farhan";
}

export function usePersona(): Person & { id: PersonaId; other: PersonaId } {
  const id = usePersonaId();
  return { ...PEOPLE[id], id, other: counterpart(id) };
}

/** Every in-app link. Always build hrefs with this so the persona stays in the URL. */
export function useNav() {
  const p = usePersonaId();
  const base = `/rapport/${p}`;
  return {
    home: `${base}/home`,
    profile: `${base}/profile`,
    calendar: `${base}/calendar`,
    capture: `${base}/capture`,
    tag: `${base}/capture/tag`,
    memory: `${base}/memory`,
    people: `${base}/people`,
    person: (id: PersonId) => `${base}/people/${id}`,
    exchange: (id: PersonId) => `${base}/exchange/${id}`,
    match: (id: PersonId) => `${base}/match/${id}`,
  };
}
export type Nav = ReturnType<typeof useNav>;

/** Re-renders every `ms` with the current time. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * The connection between the phone owner and `other`, with live exchange
 * progress. Also completes the exchange when the last message has landed.
 */
export function useConnection(other: PersonId) {
  const me = usePersonaId();
  const id = pairId(me, other);
  const conn: Connection | undefined = useDemo((s) => s.connections[id]);
  const live = conn?.status === "exchanging" || conn?.status === "requested";
  const now = useNow(live ? 250 : 5000);
  const step = exchangeStep(conn, now);
  const completeExchange = useDemo((s) => s.completeExchange);

  useEffect(() => {
    if (conn?.status !== "exchanging" || step < EXCHANGE_TOTAL) return;
    // Let the last bubble land before flipping both phones to "matched".
    const t = setTimeout(() => completeExchange(id), 1200);
    return () => clearTimeout(t);
  }, [conn?.status, step, id, completeExchange]);

  const status = conn?.status ?? "idle";
  return {
    id,
    conn,
    status,
    step,
    total: EXCHANGE_TOTAL,
    /** The phone owner started it. */
    iStarted: conn?.initiator === me,
    /** Waiting on the phone owner to accept. */
    awaitingMe: status === "requested" && conn?.recipient === me,
    /** Waiting on the other side to accept. */
    awaitingThem: status === "requested" && conn?.initiator === me,
    isMatched: status === "matched" || status === "scheduled",
    isScheduled: status === "scheduled",
  };
}

/**
 * useState that survives navigation and lives in the shared store, scoped to
 * the phone owner. Use for things like the Home card index or a selected tab.
 */
export function usePersisted<T>(name: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const me = usePersonaId();
  const key = `${me}:${name}`;
  const stored = useDemo((s) => s.ui[key]) as T | undefined;
  const setUi = useDemo((s) => s.setUi);
  const value = stored === undefined ? initial : stored;
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = (useDemo.getState().ui[key] as T | undefined) ?? initial;
      setUi(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    // initial is a literal at call sites; key captures the identity that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, setUi],
  );
  return [value, set];
}

/** "04:12"-style clock for the live hallway recording, ticking from demo start. */
export function useRecordingClock(offsetSeconds = 252): string {
  const bootedAt = useDemo((s) => s.bootedAt);
  const now = useNow(1000);
  const secs = Math.max(0, Math.floor((now - bootedAt) / 1000)) + offsetSeconds;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** The `[id]` segment on /people/[id], /exchange/[id], /match/[id]. Falls back to the other phone owner. */
export function useRouteId(): PersonId {
  const params = useParams<{ id?: string }>();
  const me = usePersonaId();
  const raw = params?.id;
  return raw && raw in PEOPLE && raw !== me ? (raw as PersonId) : counterpart(me);
}
