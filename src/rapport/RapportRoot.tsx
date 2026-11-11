"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { syncAcrossFrames, useDemo } from "./store";
import { Notices } from "./ui/Notices";

const noSubscription = () => () => {};

/**
 * Client-only root for the phone app. Rendering only on the client keeps the
 * localStorage-backed store out of server HTML, so there are no hydration
 * mismatches. The inline script in the layout has already painted the right
 * background colour, so the gap is invisible.
 */
export function RapportRoot({ children }: { children: ReactNode }) {
  // false in server HTML and during hydration, true once React renders on the client.
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);
  const theme = useDemo((s) => s.theme);

  useEffect(() => syncAcrossFrames(), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-rp", theme);
  }, [theme]);

  if (!mounted) return null;
  return (
    <>
      {children}
      <Notices />
    </>
  );
}

/** Runs before first paint: theme attribute + framed flag on <html>. */
export const PREPAINT_SCRIPT = `(function(){var d=document.documentElement,t="dark";try{var r=localStorage.getItem("rapport-demo-v1");if(r){var s=JSON.parse(r);if(s&&s.state&&s.state.theme==="light")t="light";}}catch(e){}d.setAttribute("data-rp",t);try{if(window.self!==window.top)d.setAttribute("data-framed","");}catch(e){d.setAttribute("data-framed","");}})();`;
