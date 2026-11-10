"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLES, photoFromFile, photoFromSample, toJpeg, type Photo } from "./scan-utils";

type Load = () => Promise<Photo>;

function Corner({ className }: { className: string }) {
  return <span aria-hidden className={cn("absolute size-7 border-ink-foreground/70", className)} />;
}

/** Full-height ink viewfinder: live camera when there is one, a file picker when there is not. */
export function CaptureView({ onPhoto }: { onPhoto: (load: Load) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    const devices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!devices?.getUserMedia) return;
    devices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const el = video.current;
        if (!el) return;
        el.srcObject = s;
        el.play().catch(() => undefined);
        setLive(true);
      })
      .catch(() => setLive(false));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function shutter() {
    const el = video.current;
    if (live && el && el.videoWidth) {
      onPhoto(async () => {
        const blob = await toJpeg(el, el.videoWidth, el.videoHeight);
        return photoFromFile(blob);
      });
    } else {
      cameraInput.current?.click();
    }
  }

  function picked(files: FileList | null) {
    const file = files?.[0];
    if (file) onPhoto(() => photoFromFile(file));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink text-ink-foreground">
      <div className="relative mx-4 mt-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-2xl bg-ink-raised">
        <video ref={video} playsInline muted className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", live ? "opacity-100" : "opacity-0")} />
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-muted">
            <Camera className="size-9" strokeWidth={1.5} />
            <p className="text-[15px]">Take or upload a photo</p>
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-6">
          <Corner className="top-0 left-0 rounded-tl-xl border-t-2 border-l-2" />
          <Corner className="top-0 right-0 rounded-tr-xl border-t-2 border-r-2" />
          <Corner className="bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2" />
          <Corner className="right-0 bottom-0 rounded-br-xl border-r-2 border-b-2" />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-5">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="text-label text-ink-muted">Try a sample</span>
          {SAMPLES.map((s) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Try sample: ${s.label}`}
              onClick={() => onPhoto(() => photoFromSample(s.src))}
              className="size-11 overflow-hidden rounded-lg border border-ink-border outline-none transition-opacity duration-150 hover:opacity-80 focus-visible:ring-3 focus-visible:ring-primary/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={() => uploadInput.current?.click()}
            className="flex min-h-11 items-center gap-2 justify-self-start rounded-lg pr-2 text-[14px] font-semibold text-ink-muted outline-none transition-colors duration-150 hover:text-ink-foreground focus-visible:ring-3 focus-visible:ring-primary/40"
          >
            <ImageUp className="size-[18px]" />
            Upload a photo
          </button>
          <button
            type="button"
            aria-label="Take photo"
            onClick={shutter}
            className="flex size-[76px] items-center justify-center rounded-full border-[3px] border-ink-foreground outline-none transition-transform duration-150 focus-visible:ring-3 focus-visible:ring-primary/40 active:scale-95"
          >
            <span className="size-[60px] rounded-full bg-ink-foreground" />
          </button>
          <span aria-hidden />
        </div>
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { picked(e.target.files); e.target.value = ""; }} />
      <input ref={uploadInput} type="file" accept="image/*" hidden onChange={(e) => { picked(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
