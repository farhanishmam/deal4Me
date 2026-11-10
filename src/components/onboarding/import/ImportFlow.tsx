"use client";

import { useState } from "react";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { FlowHeading, FlowStage, FlowTopBar } from "@/components/onboarding/import/FlowChrome";
import { ImportItemCard } from "@/components/onboarding/import/ImportItemCard";
import { ImportProgress } from "@/components/onboarding/import/ImportProgress";
import { useOnboardingTimer } from "@/components/onboarding/import/useOnboardingTimer";
import { SuccessMoment } from "@/components/onboarding/SuccessMoment";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { WEBSITE_DEMOS } from "@/lib/website-demo";
import type { Item, Shop } from "@/lib/types";

const STEPS = [
  "Reading your site",
  "Finding menu items",
  "Pricing with the deals agent",
  "Building your storefront",
];

const SAMPLE_MENU = `Carne asada taco - $4
Al pastor taco - $4
Baja fish taco - $5
Burrito - $11
Loaded nachos - $9
Horchata - $4`;

type Phase = "idle" | "running" | "done" | "error";

export function ImportFlow() {
  useOnboardingTimer();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");

  const canSubmit = url.trim().length > 0 || text.trim().length > 0;

  async function run(input = { url: url.trim() || undefined, text: text.trim() || undefined }) {
    if ((!input.url && !input.text) || phase === "running") return;
    setPhase("running");
    setError("");
    setStep(0);
    setItems([]);
    try {
      const result = await api.importFromWebsite(
        input,
        {
          onStep: (label) => {
            const i = STEPS.indexOf(label);
            if (i >= 0) setStep(i);
          },
          onItem: (item) => setItems((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item])),
        },
      );
      setStep(STEPS.length);
      setShop(result);
      setPhase("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that website. Try again.");
      setPhase("error");
    }
  }

  const sections = shop?.storefront.sections.length ?? 0;
  const done = phase === "done" && shop;

  return (
    <FlowStage photo="lawn">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <FlowTopBar />

        <div className={done ? "flex flex-col gap-8 py-6 sm:py-10" : "flex flex-1 flex-col justify-center gap-8 pt-2 pb-12 sm:gap-12 sm:pb-20"}>
          <FlowHeading
            eyebrow="From your website"
            title="Import your website"
            sub={phase === "idle" ? "Your items, prices, and photos. Already there." : undefined}
            compact={phase !== "idle"}
            srOnly={Boolean(done)}
          />

          {phase === "idle" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run();
              }}
              className="mx-auto flex w-full max-w-2xl animate-rise flex-col items-stretch gap-5"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="site-url" className="sr-only">
                  Website
                </label>
                <Input
                  id="site-url"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="your-website.com/menu"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setText(""); }}
                  className="h-14 rounded-xl bg-card/70 px-4 text-[16px] backdrop-blur-md"
                />
                <Button type="submit" size="lg" disabled={!canSubmit} className="h-14 rounded-xl px-8 text-[17px] font-semibold sm:shrink-0 disabled:bg-card disabled:text-muted-foreground disabled:opacity-100 disabled:ring-1 disabled:ring-border">
                  {text.trim() && !url.trim() ? "Build from menu" : "Import website"}
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {WEBSITE_DEMOS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    title={demo.detail}
                    onClick={() => {
                      setUrl(demo.url);
                      setText("");
                      void run({ url: demo.url, text: undefined });
                    }}
                    className="group inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background/45 px-4 text-sm font-medium text-foreground backdrop-blur-md transition-colors duration-150 outline-none hover:bg-card focus-visible:ring-3 focus-visible:ring-primary/15"
                  >
                    <Globe2 className="size-4 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />
                    {demo.label}
                  </button>
                ))}
              </div>

              <details className="group mx-auto w-full max-w-xl">
                <summary className="mx-auto flex h-11 w-fit cursor-pointer items-center rounded-md px-3 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15">Paste a menu instead</summary>
                <div className="mt-2 flex flex-col items-start gap-2">
                  <label htmlFor="menu-text" className="sr-only">Menu</label>
                  <Textarea
                    id="menu-text"
                    placeholder={"Burrito - $11\nHorchata - $4"}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setUrl(""); }}
                    className="min-h-32 rounded-xl bg-card/70 text-[15px] backdrop-blur-md"
                  />
                  <button type="button" onClick={() => { setText(SAMPLE_MENU); setUrl(""); }} className="inline-flex min-h-10 w-fit items-center rounded-md text-sm text-muted-foreground underline underline-offset-4 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15">Use sample menu</button>
                </div>
              </details>
            </form>
          )}

          {phase === "running" && <ImportProgress steps={STEPS} current={step} items={items} />}

          {phase === "error" && (
            <div className="mx-auto flex w-full max-w-xl animate-rise flex-col items-center gap-5 rounded-2xl border border-border bg-card/70 p-6 text-center backdrop-blur-md sm:p-8">
              <StatusPill tone="danger" dot>
                Import stopped
              </StatusPill>
              <p role="alert" className="text-[16px] leading-snug">{error}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button size="lg" className="h-12 rounded-xl px-8 text-[16px] font-semibold" onClick={() => void run()}>Try again</Button>
                <Button size="lg" variant="outline" className="h-12 rounded-xl px-8 text-[16px] font-semibold" onClick={() => setPhase("idle")}>
                  Edit
                </Button>
              </div>
            </div>
          )}

          {done && (
            <div className="flex flex-col gap-6">
              <p className="animate-rise font-mono text-[12px] tracking-wide text-muted-foreground uppercase tabular-nums">
                {items.length} items in {sections} {sections === 1 ? "section" : "sections"}
              </p>
              <SuccessMoment shop={shop} />
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <ImportItemCard key={item.id} item={item} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </FlowStage>
  );
}
