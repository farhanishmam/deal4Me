"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Store } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Logo } from "@/components/shared/Logo";
import { Storefront } from "@/components/storefront/Storefront";
import { buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useHydrated, useStore } from "@/lib/store";

export function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? "");
  const hydrated = useHydrated();
  const shops = useStore((s) => s.shops);
  const allItems = useStore((s) => s.items);

  const shop = shops.find((s) => s.slug === slug || s.id === slug);
  const items = useMemo(() => (shop ? allItems.filter((i) => i.shopId === shop.id) : []), [allItems, shop]);

  useEffect(() => {
    document.title = shop ? `${shop.name} | ${BRAND.name}` : BRAND.name;
  }, [shop]);

  if (shop) {
    return <Storefront config={shop.storefront} items={items} mode="public" />;
  }

  // A shop made in this browser may not be loaded yet. Wait before saying it is missing.
  if (!hydrated) return <div className="min-h-screen flex-1 bg-background" aria-busy />;

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="px-6 py-5 sm:px-8">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <EmptyState
          icon={<Store />}
          title="This shop is not here"
          description="The link may be old, or the shop is not live yet."
          action={
            <Link href="/visit/home" className={buttonVariants({ size: "lg" })}>
              Browse shops
            </Link>
          }
        />
      </div>
    </main>
  );
}
