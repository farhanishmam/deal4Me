"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PEOPLE, toneVars, type PersonId, type Tone } from "../data/people";
import { Icon } from "./Icon";

/** 11px uppercase label used for every section heading in the design. */
export function Eyebrow({
  children,
  as: Tag = "p",
  className,
  id,
}: {
  children: ReactNode;
  as?: "p" | "h2" | "h3" | "span";
  className?: string;
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={cn("m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-rp-text3", className)}
    >
      {children}
    </Tag>
  );
}

/** Serif initials in a tinted circle. Pass `personId` or explicit initials + tone. */
export function Avatar({
  personId,
  initials,
  tone,
  size = 48,
  className,
  ring,
}: {
  personId?: PersonId;
  initials?: string;
  tone?: Tone;
  size?: number;
  className?: string;
  /** Override the border colour, e.g. "var(--rp-gold-mid)". */
  ring?: string;
}) {
  const p = personId ? PEOPLE[personId] : undefined;
  const t = toneVars(tone ?? p?.tone ?? "gold");
  return (
    <span
      aria-hidden
      className={cn("flex flex-none items-center justify-center rounded-full border font-rp-serif", className)}
      style={{
        width: size,
        height: size,
        background: t.bg,
        borderColor: ring ?? t.line,
        color: t.fg,
        fontSize: Math.round(size * 0.41),
      }}
    >
      {initials ?? p?.initials}
    </span>
  );
}

/** The phone owner's own agent mark (gold target). */
export function AgentMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center rounded-full border border-rp-gold-line bg-rp-gold-bg text-rp-gold",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon name="agent" size={Math.round(size / 2)} />
    </span>
  );
}

/** Track-and-knob switch visual. Wrap it in a <button aria-pressed>; it is decorative. */
export function SwitchVisual({ on, small = false }: { on: boolean; small?: boolean }) {
  const w = small ? 44 : 46;
  const h = small ? 26 : 28;
  const k = small ? 20 : 22;
  return (
    <span
      aria-hidden
      className="flex flex-none items-center rounded-full p-[3px] transition-colors duration-200"
      style={{
        width: w,
        height: h,
        background: on ? "var(--rp-fill)" : "var(--rp-off)",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span
        className="rounded-full transition-colors duration-200"
        style={{ width: k, height: k, background: on ? "var(--rp-on-fill)" : "var(--rp-knob)" }}
      />
    </span>
  );
}

/** 44px round back link used in detail-screen headers. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-rp-text"
    >
      <Icon name="chevronLeft" strokeWidth={1.8} />
    </Link>
  );
}

/** Pill-shaped status tag, e.g. "Auto", "Public", "LIVE". */
export function Tag({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode;
  tone?: Tone | "neutral";
  className?: string;
}) {
  const t = tone === "neutral" ? null : toneVars(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-semibold",
        className,
      )}
      style={
        t
          ? { background: t.bg, borderColor: t.line, color: t.fg }
          : { background: "transparent", borderColor: "var(--rp-line)", color: "var(--rp-text2)" }
      }
    >
      {children}
    </span>
  );
}

/** Small pulsing dot for LIVE / REC indicators. */
export function LiveDot({ color = "var(--rp-ember)", size = 7 }: { color?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="rp-pulse inline-block flex-none rounded-full"
      style={{ width: size, height: size, background: color }}
    />
  );
}
