"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSellerShop } from "@/lib/seller";
import type { Item } from "@/lib/types";
import { CaptureView } from "./CaptureView";
import { ListedView } from "./ListedView";
import { ResultView } from "./ResultView";
import { WorkingView } from "./WorkingView";
import { appraisePhoto, buildItem, listNewItem, type Appraisal, type Photo, type ScanKind } from "./scan-utils";

type Stage =
  | { name: "capture" }
  | { name: "working"; run: number; photo?: Photo }
  | { name: "failed"; photo?: Photo; message: string }
  | { name: "result"; photo: Photo; appraisal: Appraisal; listing?: boolean; error?: string }
  | { name: "listed"; item: Item };

const MIN_WORKING_MS = 1800;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const message = (e: unknown) => (e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");

export function ScanFlow() {
  const { shop } = useSellerShop();
  const [stage, setStage] = useState<Stage>({ name: "capture" });
  const run = useRef(0);

  async function start(load: () => Promise<Photo>) {
    const id = ++run.current;
    const live = () => run.current === id;
    setStage({ name: "working", run: id });
    let photo: Photo | undefined;
    try {
      photo = await load();
      if (!live()) return;
      setStage({ name: "working", run: id, photo });
      const [appraisal] = await Promise.all([appraisePhoto(photo), wait(MIN_WORKING_MS)]);
      if (!live()) return;
      setStage({ name: "result", photo, appraisal });
    } catch (e) {
      if (live()) setStage({ name: "failed", photo, message: message(e) });
    }
  }

  function toCapture() {
    run.current++;
    setStage({ name: "capture" });
  }

  async function list(s: Extract<Stage, { name: "result" }>, kind: ScanKind, amountCents: number) {
    if (!shop) return;
    setStage({ ...s, listing: true, error: undefined });
    try {
      const saved = await listNewItem(shop.id, buildItem(shop.id, kind, s.photo, s.appraisal, amountCents));
      setStage({ name: "listed", item: saved });
    } catch (e) {
      setStage({ ...s, listing: false, error: message(e) });
    }
  }

  switch (stage.name) {
    case "capture":
      return (
        <CaptureView onPhoto={(load) => void start(load)} />
      );
    case "working":
      return <WorkingView key={stage.run} photo={stage.photo} onCancel={toCapture} />;
    case "failed": {
      const { photo } = stage;
      return (
        <div className="flex min-h-0 flex-1 flex-col bg-ink px-4 pb-3 text-ink-foreground">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="text-[20px] font-bold tracking-[-0.018em]">Could not price this</h1>
            <p role="alert" className="mt-2 max-w-[300px] text-[15px] text-ink-muted">{stage.message}</p>
          </div>
          <div className="flex flex-col gap-2">
            {photo && (
              <Button type="button" onClick={() => void start(async () => photo)} className="h-12 w-full rounded-xl text-[17px] font-semibold">
                Try again
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={toCapture}
              className="h-12 w-full rounded-xl border-ink-border bg-transparent text-[17px] font-semibold text-ink-foreground hover:bg-ink-raised hover:text-ink-foreground"
            >
              Choose another photo
            </Button>
          </div>
        </div>
      );
    }
    case "result":
      return (
        <ResultView
          key={stage.photo.url.length + stage.appraisal.item.name}
          photo={stage.photo}
          appraisal={stage.appraisal}
          canList={!!shop}
          listing={!!stage.listing}
          error={stage.error}
          onList={(kind, cents) => void list(stage, kind, cents)}
          onDiscard={toCapture}
        />
      );
    case "listed":
      return <ListedView item={stage.item} onAgain={toCapture} />;
  }
}
