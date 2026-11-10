"use client";

import { ScreenShell } from "../ui/ScreenShell";

export function Capture() {
  return (
    <ScreenShell tab="capture">
      <main className="rp-scroll flex min-h-0 flex-1 flex-col gap-4 px-5 pt-[30px] pb-2.5">
        <h1 className="m-0 font-rp-serif text-[40px] leading-none font-normal">Capture</h1>
        <p className="m-0 text-sm text-rp-text2">Screen in progress.</p>
      </main>
    </ScreenShell>
  );
}
