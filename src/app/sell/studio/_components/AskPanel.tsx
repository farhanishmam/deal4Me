"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Loader2, Sparkles, Undo2 } from "lucide-react";
import { MicButton } from "@/components/shared/MicButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useVoiceInput } from "@/lib/real/useVoiceInput";
import { getShop, useShop, useStore } from "@/lib/store";
import type { StorefrontConfig } from "@/lib/types";
import type { FlashTarget } from "./StudioView";

type Run =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done"; changes: string[]; before: StorefrontConfig; undone: boolean }
  | { status: "error"; message: string };

function targetFor(changes: string[]): FlashTarget {
  const head = changes[0] ?? "";
  if (head.startsWith("Sections")) return "section";
  if (head.startsWith("Promo")) return "promo";
  if (head.startsWith("Languages")) return "languages";
  if (head.startsWith("Tagline")) return "tagline";
  return "all";
}

/** The four suggestion chips, adapted so that each one changes this shop's preview. */
function useChips(shopId: string): string[] {
  const shop = useShop(shopId);
  const sections = shop?.storefront.sections ?? [];
  const breakfast = sections.findIndex((s) => /breakfast/i.test(s.title) || s.id.includes("breakfast"));

  let order: string;
  if (breakfast > 0) order = "Put breakfast first";
  else if (sections.length > 1) {
    // Breakfast is already first (or missing): offer the next section so the page visibly moves.
    const other = sections.find((_, i) => i === 1) ?? sections[0];
    order = `Put ${other.title.toLowerCase()} first`;
  } else order = "Skis, boots and jackets, ready at pickup";

  return ["Make it feel like a ski lodge", order, "Add 10% off drinks after 3pm", "Translate to Japanese and Spanish"];
}

export function AskPanel({ shopId, onFlash }: { shopId: string; onFlash: (t: FlashTarget) => void }) {
  const [text, setText] = useState("");
  const transcriptInput = useRef<HTMLTextAreaElement>(null);
  const [run, setRun] = useState<Run>({ status: "idle" });
  const chips = useChips(shopId);
  const busy = run.status === "working";

  const submit = async (instruction: string) => {
    const value = instruction.trim();
    if (!value || busy || voice.state !== "idle") return;
    const shop = getShop(shopId);
    if (!shop) return;
    const before = shop.storefront;
    setText(value);
    setRun({ status: "working" });
    try {
      const { changes } = await api.applyStorefrontInstruction(shopId, value);
      setRun({ status: "done", changes, before, undone: false });
      onFlash(targetFor(changes));
      setText("");
    } catch (error) {
      setRun({ status: "error", message: error instanceof Error ? error.message : "Something went wrong. Try again." });
    }
  };

  const undo = () => {
    if (run.status !== "done" || run.undone) return;
    const shop = getShop(shopId);
    if (!shop) return;
    useStore.getState().upsertShop({ ...shop, name: run.before.name, storefront: run.before });
    useStore.getState().logStep({ actor: "Storefront agent", action: "Undid the last storefront change" });
    setRun({ ...run, undone: true });
    onFlash("all");
  };

  const voice = useVoiceInput({
    onPartialText: setText,
    onText: setText,
  });
  const voiceBusy = voice.state !== "idle";

  useEffect(() => {
    const input = transcriptInput.current;
    if (voiceBusy && input) input.scrollTop = input.scrollHeight;
  }, [text, voiceBusy]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-input bg-card transition-colors duration-150 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/15">
        <Textarea
          ref={transcriptInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(text);
            }
          }}
          placeholder="Tell the agent what to change"
          aria-label="Instruction"
          disabled={busy}
          readOnly={voiceBusy}
          className="min-h-24 resize-none border-0 bg-transparent px-4 pt-3.5 shadow-none ring-0 focus-visible:ring-0"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <MicButton
            state={busy ? "processing" : voice.state}
            onClick={() => {
              if (busy) return;
              voice.toggle();
            }}
            className="size-10"
          />
          <Button onClick={() => void submit(text)} disabled={busy || voiceBusy || !text.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
            Apply
          </Button>
        </div>
      </div>

      {voiceBusy && <p aria-live="polite" className="-mt-3 text-sm text-muted-foreground">{voice.state === "listening" ? "Speak, then tap the mic to finish." : "Finishing your transcript…"}</p>}
      {voice.error && <p role="alert" className="-mt-3 text-sm text-destructive">{voice.error}</p>}

      {run.status !== "idle" && (
        <div aria-live="polite" className="animate-rise">
          {run.status === "working" && (
            <p className="flex items-center gap-2.5 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              Storefront agent is editing...
            </p>
          )}
          {run.status === "error" && (
            <p role="alert" className="text-sm text-destructive">{run.message}</p>
          )}
          {run.status === "done" && (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2">
                {(run.undone ? ["Change undone"] : run.changes).map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              {!run.undone && (
                <Button variant="outline" size="sm" className="w-fit" onClick={undo}>
                  <Undo2 />
                  Undo
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-eyebrow uppercase text-muted-foreground">Try</p>
        <ul className="flex flex-col">
          {chips.map((c) => (
            <li key={c} className="border-t border-border first:border-t-0">
              <button
                type="button"
                disabled={busy || voiceBusy}
                onClick={() => void submit(c)}
                className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-primary/15 disabled:opacity-50"
              >
                <Sparkles className="size-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary" />
                {c}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
