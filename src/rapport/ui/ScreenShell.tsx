"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TabBar, type TabKey } from "./TabBar";

/**
 * Every screen's root. Fills the phone (390x844 in the demo frame), reserves
 * the status-bar safe area, and pins the tab bar when `tab` is set.
 *
 * Inside, use the design's structure:
 *   <ScreenShell tab="home">
 *     <main className="rp-scroll min-h-0 flex-1 px-5 pt-[30px] pb-2.5 flex flex-col gap-4">…</main>
 *     {optional dock / action bar (flex-none)}
 *   </ScreenShell>
 * The tab bar renders after the children.
 */
export function ScreenShell({
  tab,
  children,
  className,
}: {
  tab?: TabKey;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-rp-bg pt-(--rp-safe-top) font-rp-sans text-rp-text",
        className,
      )}
    >
      {children}
      {tab ? <TabBar active={tab} /> : null}
    </div>
  );
}
