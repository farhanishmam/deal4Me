"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Monitor, Share2, Smartphone, Store } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusPill } from "@/components/shared/StatusPill";
import { Storefront } from "@/components/storefront/Storefront";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { duration } from "@/lib/format";
import { useHydrated, useShop, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AskPanel } from "./AskPanel";
import { DesignPanel } from "./DesignPanel";
import { ItemSheet } from "./ItemSheet";
import { ItemsPanel } from "./ItemsPanel";
import { Segmented } from "./Segmented";
import { ShareDialog } from "./ShareDialog";

/** What to flash in the preview after a change. */
export type FlashTarget = "all" | "section" | "promo" | "languages" | "tagline";

const SELECTORS: Record<Exclude<FlashTarget, "all">, string> = {
  section: ".sf-section",
  promo: ".sf-strip",
  languages: ".sf-lang",
  tagline: ".sf-greeting",
};

const FLASH_CSS = `
@keyframes studio-flash {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 55%, transparent); background-color: color-mix(in srgb, var(--primary) 8%, transparent); }
  35% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--primary) 45%, transparent); background-color: color-mix(in srgb, var(--primary) 8%, transparent); }
  100% { box-shadow: 0 0 0 10px transparent; background-color: transparent; }
}
[data-studio-flash] { animation: studio-flash 1.5s ease-out 1; border-radius: 12px; }
[data-studio-flash="all"] { border-radius: inherit; animation-name: studio-flash-all; }
@keyframes studio-flash-all {
  0% { box-shadow: inset 0 0 0 0 transparent; }
  30% { box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--primary) 70%, transparent); }
  100% { box-shadow: inset 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) { [data-studio-flash] { animation: none; } }
`;

/** The desktop page is laid out at this width, then scaled to fit the preview. */
const DESKTOP_WIDTH = 1200;

const WIDE = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function StudioView({ shopId }: { shopId: string }) {
  const shop = useShop(shopId);
  const hydrated = useHydrated();
  const allItems = useStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.shopId === shopId), [allItems, shopId]);

  const [picked, setDevice] = useState<"desktop" | "phone">("desktop");
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  // Small screens only have room for the phone view.
  const device = wide ? picked : "phone";
  const [shareOpen, setShareOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const [publishing, setPublishing] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Scrolls the preview to what changed and pulses it for a moment. */
  const flash = useCallback((target: FlashTarget) => {
    // Wait a beat so the preview has re-rendered with the change.
    setTimeout(() => {
      const root = scroller.current;
      if (!root) return;
      root.querySelectorAll("[data-studio-flash]").forEach((e) => e.removeAttribute("data-studio-flash"));
      const el = target === "all" ? null : root.querySelector<HTMLElement>(SELECTORS[target]);
      const node = el ?? root;
      if (el) {
        const top = root.scrollTop + (el.getBoundingClientRect().top - root.getBoundingClientRect().top) - 110;
        root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
      // Restart the animation even when the same node flashes twice in a row.
      void node.offsetWidth;
      node.setAttribute("data-studio-flash", el ? "node" : "all");
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => node.removeAttribute("data-studio-flash"), 1700);
    }, 90);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el || device !== "desktop") return;
    const measure = () => setZoom(Math.min(1, el.clientWidth / DESKTOP_WIDTH));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device, shop]);

  // Shops load after mount, so wait before saying this one is missing.
  if (!shop && !hydrated) return <div className="flex-1" aria-busy />;

  if (!shop) {
    return (
      <EmptyState
        icon={<Store />}
        title="Shop not found"
        description="Pick a shop from the dashboard."
        action={
          <Link href="/sell/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        }
      />
    );
  }

  const editing = editingId ? items.find((i) => i.id === editingId) : undefined;
  const live = Boolean(shop.liveAt);
  const publicPath = `/s/${shop.slug}`;

  // publishShop reports its own errors with a toast and a retry action.
  const publish = async () => {
    setPublishing(true);
    try {
      await useStore.getState().publishShop(shop.id, { timed: false });
    } finally {
      setPublishing(false);
    }
  };

  const frame =
    device === "phone" ? (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted p-4 lg:p-6">
        <div
          ref={scroller}
          style={{ background: shop.storefront.theme.background }}
          className="h-full max-h-[844px] w-full max-w-[406px] overflow-y-auto overscroll-contain rounded-xl border-0 [scrollbar-width:none] lg:rounded-[36px] lg:border-[8px] lg:border-ink [&::-webkit-scrollbar]:hidden"
        >
          <Storefront config={shop.storefront} items={items} mode="preview" device="phone" />
        </div>
      </div>
    ) : (
      <div
        ref={scroller}
        style={{ background: shop.storefront.theme.background }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div style={{ zoom }}>
          <Storefront config={shop.storefront} items={items} mode="preview" device="desktop" />
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-5 lg:h-[calc(100dvh-4rem)]">
      <style>{FLASH_CSS}</style>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusPill tone={live ? "success" : "neutral"} dot>
              {live ? "Live" : "Draft"}
            </StatusPill>
            {live && shop.onboardingSeconds !== undefined && (
              <span className="tabular-nums">Went live in {duration(shop.onboardingSeconds)}</span>
            )}
          </div>
          <h1 className="mt-1.5 truncate text-title">{shop.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!live && (
            <Button onClick={publish} disabled={publishing}>
              {publishing && <Loader2 className="animate-spin" />}
              {publishing ? "Publishing..." : "Publish"}
            </Button>
          )}
          <Link href={publicPath} target="_blank" className={buttonVariants({ variant: "outline" })}>
            View public page
            <ArrowUpRight />
          </Link>
          <Button onClick={() => setShareOpen(true)}>
            <Share2 />
            Share
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* live preview */}
        <section
          aria-label="Preview"
          className="flex h-[560px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:h-auto"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold">Preview</span>
            <Segmented
              className="max-lg:hidden"
              label="Device"
              value={device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: "Desktop", icon: <Monitor /> },
                { value: "phone", label: "Phone", icon: <Smartphone /> },
              ]}
            />
          </div>
          {frame}
        </section>

        {/* editor panel */}
        <section aria-label="Editor" className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <Tabs defaultValue="ask" className="min-h-0 flex-1 gap-0">
            <div className="shrink-0 border-b border-border p-4">
              <TabsList className="w-full group-data-horizontal/tabs:h-10">
                <TabsTrigger value="ask">Ask</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="ask" keepMounted className="min-h-0 overflow-y-auto p-5">
              <AskPanel shopId={shopId} onFlash={flash} />
            </TabsContent>
            <TabsContent value="design" className="min-h-0 overflow-y-auto p-5">
              <DesignPanel shopId={shopId} onFlash={flash} />
            </TabsContent>
            <TabsContent value={"items"} className={cn("min-h-0 overflow-y-auto p-5")}>
              <ItemsPanel shopId={shopId} items={items} onOpen={setEditingId} />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {editing && (
        <ItemSheet
          key={editing.id}
          item={editing}
          open
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
        />
      )}
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} name={shop.name} path={publicPath} />
    </div>
  );
}
