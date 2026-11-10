"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { dataViewFor } from "@/lib/real/catalog";
import { StoreHydrator } from "@/lib/store-hydrator";

/** Marketplace-only globals. The Rapport app (/rapport, /demo) runs without them. */
export function MarketplaceChrome() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/rapport") || pathname.startsWith("/demo")) return null;
  return (
    <>
      <StoreHydrator view={dataViewFor(pathname)} />
      <Toaster position="bottom-center" />
    </>
  );
}
