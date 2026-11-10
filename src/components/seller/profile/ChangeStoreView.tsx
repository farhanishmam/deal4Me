"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Check, ImagePlus, Loader2, Undo2 } from "lucide-react";
import { MicButton } from "@/components/shared/MicButton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Storefront } from "@/components/storefront/Storefront";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { saveShop } from "@/lib/real/catalog";
import { useVoiceInput } from "@/lib/real/useVoiceInput";
import { useSellerShop } from "@/lib/seller";
import { getShop, useStore } from "@/lib/store";
import type { StorefrontConfig } from "@/lib/types";
import { pictureToJpegDataUrl } from "./resizePhoto";

const SUGGESTIONS = ["Make it warmer and more welcoming", "Add a weekend special banner", "Translate it to Spanish"];
const WORKING_STEPS = ["Reading your request", "Choosing what to change", "Saving your store"];

type Run =
  | { status: "idle" }
  | { status: "working"; label: string }
  | { status: "done"; changes: string[] }
  | { status: "error"; message: string };

interface Snapshot {
  name: string;
  storefront: StorefrontConfig;
}

export function ChangeStoreView() {
  const { hydrated, shop, items } = useSellerShop();
  const upsertShop = useStore((s) => s.upsertShop);
  const [text, setText] = useState("");
  const [run, setRun] = useState<Run>({ status: "idle" });
  const [previous, setPrevious] = useState<Snapshot | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(stepTimer.current), []);

  const voice = useVoiceInput({ onPartialText: setText, onText: setText });
  const voiceBusy = voice.state !== "idle";
  const working = run.status === "working";
  const busy = working || voiceBusy;
  const shopId = shop?.id;

  const begin = (label: string) => {
    clearInterval(stepTimer.current);
    setRun({ status: "working", label });
  };

  const submit = async (instruction: string) => {
    const value = instruction.trim();
    const current = getShop(shopId);
    if (!value || busy || !current) return;
    const before: Snapshot = { name: current.name, storefront: current.storefront };
    setText(value);
    let step = 0;
    begin(WORKING_STEPS[0]);
    stepTimer.current = setInterval(() => {
      step = Math.min(step + 1, WORKING_STEPS.length - 1);
      setRun((r) => (r.status === "working" ? { status: "working", label: WORKING_STEPS[step] } : r));
    }, 3000);
    try {
      const { config, changes } = await api.applyStorefrontInstruction(current.id, value);
      const after = getShop(current.id);
      // The api saves the shop itself. Make sure the store holds the returned config too.
      if (after && JSON.stringify(after.storefront) !== JSON.stringify(config)) {
        upsertShop({ ...after, name: config.name, storefront: config });
      }
      setPrevious(JSON.stringify(before.storefront) === JSON.stringify(config) ? null : before);
      setRun({ status: "done", changes });
      setText("");
    } catch (error) {
      setRun({ status: "error", message: error instanceof Error ? error.message : "Something went wrong. Try again." });
    } finally {
      clearInterval(stepTimer.current);
    }
  };

  const undo = async () => {
    const current = getShop(shopId);
    if (!current || !previous) return;
    begin("Restoring your store");
    try {
      await saveShop({ ...current, name: previous.name, storefront: previous.storefront });
      useStore.getState().logStep({ actor: "Storefront agent", action: "Undid the last storefront change" });
      setPrevious(null);
      setRun({ status: "done", changes: ["Change undone"] });
    } catch (error) {
      setRun({ status: "error", message: error instanceof Error ? error.message : "Could not restore your store." });
    }
  };

  const addPictures = async (files: FileList | null) => {
    const picked = files ? Array.from(files).filter((f) => f.type.startsWith("image/")) : [];
    const current = getShop(shopId);
    if (!current || picked.length === 0) {
      if (files && files.length > 0) setRun({ status: "error", message: "Choose a JPG, PNG, WebP or GIF picture." });
      return;
    }
    begin("Preparing your picture");
    try {
      const heroPhotoUrl = await pictureToJpegDataUrl(picked[0]);
      const latest = getShop(current.id) ?? current;
      const before = { name: latest.name, storefront: latest.storefront };
      await saveShop({ ...latest, storefront: { ...latest.storefront, heroPhotoUrl } });
      setPrevious(before);
      setRun({
        status: "done",
        changes: [picked.length > 1 ? `Store picture updated, using the first of ${picked.length} pictures` : "Store picture updated"],
      });
    } catch (error) {
      setRun({ status: "error", message: error instanceof Error ? error.message : "Could not add that picture." });
    }
  };

  const micState = working ? "processing" : voice.state;
  const status = working
    ? "Working on it"
    : voice.state === "listening"
      ? "Listening. Tap again when you are done."
      : voice.state === "processing"
        ? "Turning your voice into text"
        : "Tap to speak";

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Change my store" backHref="/seller/profile" />

      {!hydrated ? (
        <p className="px-4 pt-6 text-[15px] text-muted-foreground">Loading your store...</p>
      ) : !shop ? (
        <div className="flex flex-col items-start gap-3 px-4 pt-6">
          <p className="text-[15px] text-muted-foreground">You do not have a store to change yet.</p>
          <Link href="/sell/start" className={buttonVariants({ size: "lg" })}>
            Set up a store
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pt-2 pb-6">
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-heading">Tell us what to change</h2>
            <MicButton
              size="lg"
              state={micState}
              onClick={() => {
                if (working) return;
                if (voice.state === "idle") setText("");
                voice.toggle();
              }}
            />
            <p aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
              {status}
            </p>
            {voice.error && (
              <p role="alert" className="text-center text-sm text-destructive">
                {voice.error}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-input bg-card transition-colors duration-150 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/15">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit(text);
                }
              }}
              placeholder="Or type it here"
              aria-label="What to change"
              disabled={working}
              readOnly={voiceBusy}
              className="min-h-16 resize-none border-0 bg-transparent px-4 pt-3 shadow-none ring-0 focus-visible:ring-0"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => fileInput.current?.click()} className="h-10 px-3 text-[14px]">
                <ImagePlus />
                Store photo
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  const input = event.currentTarget;
                  void addPictures(input.files).finally(() => {
                    input.value = "";
                  });
                }}
              />
              <Button onClick={() => void submit(text)} disabled={busy || !text.trim()} className="h-10 px-4">
                {working ? <Loader2 className="animate-spin" /> : <ArrowUp />}
                Apply
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => void submit(suggestion)}
                className="min-h-10 rounded-full bg-muted/60 px-4 text-sm font-medium outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div aria-live="polite">
            {run.status === "working" && (
              <p className="flex items-center gap-2.5 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                {run.label}...
              </p>
            )}
            {run.status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {run.message}
              </p>
            )}
            {run.status === "done" && (
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col gap-2">
                  {run.changes.map((change) => (
                    <li key={change} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
                {previous && (
                  <Button variant="outline" size="sm" onClick={() => void undo()} className="h-10 w-fit px-4">
                    <Undo2 />
                    Undo
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-label text-muted-foreground">Your store now</p>
            <div
              data-testid="store-preview"
              style={{ background: shop.storefront.theme.background }}
              className="h-[460px] overflow-y-auto overscroll-contain rounded-2xl border border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Storefront config={shop.storefront} items={items} mode="preview" device="phone" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
