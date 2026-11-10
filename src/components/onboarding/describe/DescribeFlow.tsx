"use client";

import { useEffect, useRef, useState } from "react";
import { EditableItemCard } from "@/components/onboarding/describe/EditableItemCard";
import { FlowHeading, FlowStage, FlowTopBar } from "@/components/onboarding/import/FlowChrome";
import { ImportProgress } from "@/components/onboarding/import/ImportProgress";
import { useOnboardingTimer } from "@/components/onboarding/import/useOnboardingTimer";
import { SuccessMoment } from "@/components/onboarding/SuccessMoment";
import { MicButton } from "@/components/shared/MicButton";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { isItemPhoto } from "@/lib/gear-photos";
import { useVoiceInput } from "@/lib/real/useVoiceInput";
import { VOICE_DEMO_SCRIPTS, type VoiceDemoScript } from "@/lib/voice-demo";
import { useShop, useStore } from "@/lib/store";
import type { Item, Shop } from "@/lib/types";

const STEPS = [
  "Listening to your description",
  "Finding your items",
  "Pricing with the deals agent",
  "Building your storefront",
];

type Phase = "input" | "running" | "review" | "live" | "error";

export function DescribeFlow() {
  useOnboardingTimer();
  const [text, setText] = useState("");
  const transcriptInput = useRef<HTMLTextAreaElement>(null);
  const [demoId, setDemoId] = useState<VoiceDemoScript["id"]>("ski");
  const [showText, setShowText] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [buildError, setBuildError] = useState("");
  const [step, setStep] = useState(0);
  const [arrived, setArrived] = useState<Item[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [fallback, setFallback] = useState<Shop | null>(null);

  const shop = useShop(shopId ?? undefined) ?? fallback;
  const allItems = useStore((s) => s.items);
  const items = shopId ? allItems.filter((i) => i.shopId === shopId) : [];
  const missingPhotos = items.filter((i) => !isItemPhoto(i.photoUrl)).length;
  const upsertShop = useStore((s) => s.upsertShop);
  const [shopName, setShopName] = useState("");

  async function run() {
    if (!text.trim() || phase === "running" || voice.state !== "idle") return;
    setPhase("running");
    setBuildError("");
    setStep(0);
    setArrived([]);
    try {
      const result = await api.importFromDescription(text.trim(), {
        onStep: (label) => {
          const i = STEPS.indexOf(label);
          if (i >= 0) setStep(i);
        },
        onItem: (item) => setArrived((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item])),
      });
      setStep(STEPS.length);
      setShopId(result.id);
      setFallback(result);
      setShopName(result.name);
      setPhase("review");
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : "We could not build that. Try again or edit your words.");
      setPhase("error");
    }
  }

  function commitName() {
    const next = shopName.trim();
    if (!shop) return;
    if (!next) {
      setShopName(shop.name);
      return;
    }
    if (next !== shop.name) upsertShop({ ...shop, name: next, storefront: { ...shop.storefront, name: next } });
  }

  const voice = useVoiceInput({
    onPartialText: (t) => {
      setShowText(true);
      setText(t);
    },
    onText: (t) => {
      setShowText(true);
      setText(t);
    },
  });
  const listening = voice.state === "listening";
  const quiet = Boolean(text.trim()) && voice.state === "idle";
  const micState = phase === "running" ? "processing" : voice.state;
  const elapsed = `${Math.floor(voice.durationMs / 60_000)}:${String(Math.floor(voice.durationMs / 1000) % 60).padStart(2, "0")}`;
  const demoScript = VOICE_DEMO_SCRIPTS.find((script) => script.id === demoId) ?? VOICE_DEMO_SCRIPTS[0];

  useEffect(() => {
    const input = transcriptInput.current;
    if (voice.state !== "idle" && input) input.scrollTop = input.scrollHeight;
  }, [text, voice.state]);

  const title =
    phase === "running" ? "Building your shop" : phase === "review" ? "Check your shop" : phase === "live" ? "Your shop is live" : "Say what you sell";

  return (
    <FlowStage photo="peak">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <FlowTopBar />

        <div className={phase === "live" ? "flex flex-col gap-8 py-6 sm:py-10" : phase === "review" ? "flex flex-col gap-8 pt-4 pb-28 sm:gap-10 sm:pt-8 sm:pb-0" : "flex flex-1 flex-col justify-center gap-8 pt-2 pb-4 sm:gap-10 sm:pb-16"}>
          <FlowHeading
            eyebrow={phase === "review" ? "Your items" : "By voice"}
            title={title}
            compact={phase !== "input" || quiet}
            srOnly={phase === "live"}
          />

          {phase === "input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run();
              }}
              className="mx-auto flex w-full max-w-xl animate-rise flex-col items-center gap-5 text-center"
              style={{ animationDelay: "120ms" }}
            >
              <style>{`@keyframes df-breathe{0%,100%{transform:scale(.9);opacity:.65}50%{transform:scale(1.12);opacity:1}}`}</style>
              <div className="relative grid place-items-center py-6 sm:py-8">
                <span
                  aria-hidden
                  className={`pointer-events-none absolute size-[300px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_42%,transparent)_0%,transparent_66%)] transition-opacity duration-500 sm:size-[440px] ${listening ? "opacity-100 motion-safe:animate-[df-breathe_3.4s_ease-in-out_infinite]" : quiet ? "opacity-0" : "opacity-40"}`}
                />
                <MicButton
                  size="lg"
                  state={micState}
                  onClick={() => {
                    if (voice.state === "idle") {
                      setShowText(true);
                    }
                    voice.toggle();
                  }}
                  className={`relative transition-transform duration-200 motion-safe:hover:scale-105 ${quiet ? "size-20 bg-card ring-1 ring-border hover:bg-muted sm:size-24 [&_svg]:size-8" : "size-28 sm:size-36 [&_svg]:size-11"} disabled:bg-card disabled:opacity-100 disabled:ring-1 disabled:ring-border`}
                />
              </div>
              <p aria-live="polite" className="min-h-6 text-[15px] text-muted-foreground tabular-nums sm:text-[17px]">
                {listening ? `Listening · ${elapsed} · Tap to finish` : voice.state === "processing" ? "Finishing your transcript" : text ? "Review your words, then build" : "Tap and talk"}
              </p>

              {voice.error && <p role="alert" className="w-full rounded-xl border border-warning/30 bg-warning-soft p-4 text-left text-sm text-warning-text">{voice.error}</p>}

              {voice.recordingUrl && (
                <div className="w-full animate-rise text-left">
                  <p className="mb-2 font-mono text-[12px] tracking-wide text-muted-foreground uppercase">Your recording</p>
                  <audio aria-label="Your voice recording" controls src={voice.recordingUrl} className="h-10 w-full" />
                </div>
              )}

              {showText ? (
                <Textarea
                  ref={transcriptInput}
                  aria-label="Your description"
                  autoFocus={voice.state === "idle"}
                  readOnly={voice.state !== "idle"}
                  placeholder="I run a taco truck near campus. Burritos are $11."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-32 rounded-xl bg-card/70 p-4 text-left text-[16px] backdrop-blur-md"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowText(true)}
                  className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15"
                >
                  Or type it
                </button>
              )}

              {showText && (
                <Button type="submit" size="lg" disabled={!text.trim() || voice.state !== "idle"} className="h-14 w-full animate-rise rounded-xl text-[17px] font-semibold disabled:bg-card disabled:text-muted-foreground disabled:opacity-100 disabled:ring-1 disabled:ring-border">
                  Build my storefront
                </Button>
              )}

              <details className="w-full text-left text-sm text-muted-foreground">
                <summary className="mx-auto flex h-11 w-fit cursor-pointer items-center rounded-md px-3 transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15">View demo scripts</summary>
                <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-md">
                  <div aria-label="Demo script" role="group" className="flex gap-2">
                    {VOICE_DEMO_SCRIPTS.map((script) => (
                      <button
                        key={script.id}
                        type="button"
                        aria-pressed={demoId === script.id}
                        onClick={() => setDemoId(script.id)}
                        className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15 ${demoId === script.id ? "border-foreground bg-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {script.label}
                      </button>
                    ))}
                  </div>
                  <p className="leading-relaxed text-foreground">{demoScript.text}</p>
                  <button
                    type="button"
                    disabled={voice.state !== "idle"}
                    onClick={() => { setText(demoScript.text); setShowText(true); }}
                    className="self-start rounded-md text-sm font-medium text-foreground underline underline-offset-4 transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-50"
                  >
                    Use this description
                  </button>
                </div>
              </details>
            </form>
          )}

          {phase === "running" && <ImportProgress steps={STEPS} current={step} items={arrived} />}

          {phase === "error" && (
            <div className="mx-auto flex w-full max-w-xl animate-rise flex-col items-center gap-5 rounded-2xl border border-border bg-card/70 p-6 text-center backdrop-blur-md sm:p-8">
              <StatusPill tone="danger" dot>
                Build stopped
              </StatusPill>
              <p role="alert" className="text-[16px] leading-snug">{buildError}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button size="lg" className="h-12 rounded-xl px-8 text-[16px] font-semibold" onClick={() => void run()}>Try again</Button>
                <Button size="lg" variant="outline" className="h-12 rounded-xl px-8 text-[16px] font-semibold" onClick={() => setPhase("input")}>
                  Edit
                </Button>
              </div>
            </div>
          )}

          {phase === "review" && shop && (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              <div className="mx-auto flex w-full max-w-md animate-rise flex-col gap-2">
                <label htmlFor="shop-name" className="font-mono text-[12px] tracking-wide text-muted-foreground uppercase">
                  Shop name
                </label>
                <Input
                  id="shop-name"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  onBlur={commitName}
                  className="h-14 rounded-xl bg-card/70 px-4 text-[17px] font-semibold backdrop-blur-md"
                />
              </div>
              {items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No items found. Go back and add prices.</p>
              ) : (
                <>
                  {missingPhotos > 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      {missingPhotos === 1 ? "1 item needs a photo." : `${missingPhotos} items need a photo.`} Add one so buyers can see what you sell.
                    </p>
                  )}
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {items.map((item) => (
                      <EditableItemCard key={item.id} item={item} />
                    ))}
                  </ul>
                </>
              )}
              <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 bg-linear-to-t from-ink via-ink/95 to-transparent px-4 pt-10 pb-4 sm:static sm:bg-none sm:px-0 sm:pt-0 sm:pb-2">
                <Button variant="outline" size="lg" onClick={() => setPhase("input")} className="hidden h-14 rounded-xl px-8 text-[16px] font-semibold sm:inline-flex">
                  Start over
                </Button>
                <Button
                  size="lg"
                  disabled={items.length === 0}
                  onClick={() => {
                    commitName();
                    setPhase("live");
                  }}
                  className="h-14 w-full rounded-xl px-10 text-[17px] font-semibold sm:w-auto"
                >
                  Go live
                </Button>
              </div>
            </div>
          )}

          {phase === "live" && shop && <SuccessMoment shop={shop} />}
        </div>
      </div>
    </FlowStage>
  );
}
