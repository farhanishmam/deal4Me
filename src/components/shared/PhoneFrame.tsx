"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

// Screen is 390 x 844. The bezel adds 8px on each side.
const BEZEL = 8;
const FRAME_H = 844 + BEZEL * 2;
const MARGIN = 24;

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
const getHeight = () => window.innerHeight;
const getServerHeight = () => FRAME_H + MARGIN * 2;

/**
 * 390x844 device on screens 640px and wider, scaled down so the whole phone
 * stays visible. Below 640px it is a plain full-height screen with no frame.
 * `footer` is pinned under the scroll area (use it for the tab bar).
 */
export function PhoneFrame({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const height = useSyncExternalStore(subscribe, getHeight, getServerHeight);
  const scale = Math.min(1, (height - MARGIN * 2) / FRAME_H);
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="h-dvh w-full bg-background sm:flex sm:items-center sm:justify-center sm:overflow-hidden">
      <div
        style={{ "--phone-scale": scale } as CSSProperties}
        className={cn(
          "relative h-full w-full",
          "sm:h-[860px] sm:w-[406px] sm:shrink-0 sm:scale-(--phone-scale) sm:rounded-[56px] sm:bg-ink sm:p-2 sm:shadow-float"
        )}
      >
        <div
          className={cn(
            "relative flex h-full w-full flex-col overflow-hidden bg-card sm:rounded-[48px]",
            className
          )}
        >
          {/* status bar and island, device only */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-12 items-center justify-between px-8 sm:flex"
          >
            <span className="text-[14px] font-semibold tracking-tight tabular-nums">
              9:41
            </span>
            <span className="absolute top-2.5 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-ink" />
            <span className="flex items-center gap-1.5 [&_svg]:size-[15px]">
              <Signal />
              <Wifi />
              <BatteryFull className="size-[18px]!" />
            </span>
          </div>
          <div className="hidden h-12 shrink-0 sm:block" aria-hidden />

          <div
            ref={scroller}
            data-phone-scroll
            className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {children}
          </div>

          {footer}

          {/* home indicator, device only */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-1/2 z-30 hidden h-1 w-[124px] -translate-x-1/2 rounded-full bg-ink sm:block"
          />
        </div>
      </div>
    </div>
  );
}
