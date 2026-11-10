"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { StoreHydrator } from "@/lib/store-hydrator";

/** Marketplace-only globals. The Rapport app (/rapport, /demo) runs without them. */
export function MarketplaceChrome() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/rapport") || pathname.startsWith("/demo")) return null;
  return (
    <>
      <StoreHydrator />
      <Toaster position="bottom-center" />
    </>
  );
}
