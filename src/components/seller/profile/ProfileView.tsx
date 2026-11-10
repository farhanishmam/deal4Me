"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink, Repeat, Sparkles, Store } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useSellerShop } from "@/lib/seller";
import { getShop, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { InlineField } from "./InlineField";
import { StoreAvatar } from "./StoreAvatar";

function LinkRow({ href, icon, label, external }: { href: string; icon: ReactNode; label: string; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex min-h-14 items-center gap-3 px-4 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60"
    >
      <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {external ? <ExternalLink className="size-4 text-muted-foreground/70" /> : <ChevronRight className="size-4 text-muted-foreground/70" />}
    </Link>
  );
}

export function ProfileView() {
  const { hydrated, shop, shops, selectShop } = useSellerShop();
  const upsertShop = useStore((s) => s.upsertShop);

  const edit = (apply: (current: NonNullable<typeof shop>) => NonNullable<typeof shop>) => {
    const current = getShop(shop?.id);
    if (current) upsertShop(apply(current));
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <h1 className="text-[20px] font-bold tracking-[-0.018em]">Profile</h1>
      </header>

      {!hydrated ? (
        <p className="px-4 pt-6 text-[15px] text-muted-foreground">Loading your store...</p>
      ) : !shop ? (
        <div className="flex flex-1 flex-col items-start gap-3 px-4 pt-6">
          <p className="text-[15px] text-muted-foreground">You do not have a store yet.</p>
          <Link href="/sell/start" className={buttonVariants({ size: "lg" })}>
            Set up a store
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5 pb-5">
          <div className="flex items-center gap-4 px-4 pt-2">
            <StoreAvatar shop={shop} />
            <div className="min-w-0">
              <p className="truncate text-heading">{shop.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {shop.liveAt ? "Live" : "Not published yet"}
              </p>
            </div>
          </div>

          {shops.length > 1 && (
            <div className="mx-4 flex min-h-12 items-center gap-3 rounded-xl bg-muted/60 px-4">
              <label htmlFor="store-switcher" className="text-[15px] text-muted-foreground">
                Store
              </label>
              <select
                id="store-switcher"
                value={shop.id}
                onChange={(event) => selectShop(event.target.value)}
                className="min-w-0 flex-1 truncate bg-transparent py-2 text-right text-[15px] font-medium outline-none"
              >
                {shops.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div key={shop.id} className="divide-y divide-border border-y border-border">
            <InlineField
              label="First name"
              value={shop.ownerFirstName}
              empty="Add your name"
              maxLength={40}
              onSave={(next) => edit((s) => ({ ...s, ownerFirstName: next }))}
            />
            <InlineField
              label="Store name"
              value={shop.name}
              empty="Name your store"
              required
              onSave={(next) => edit((s) => ({ ...s, name: next, storefront: { ...s.storefront, name: next } }))}
            />
            <InlineField
              label="Neighborhood"
              value={shop.neighborhood}
              empty="Add a neighborhood"
              maxLength={60}
              onSave={(next) => edit((s) => ({ ...s, neighborhood: next }))}
            />
            <InlineField
              label="Tagline"
              value={shop.storefront.tagline ?? ""}
              empty="Add a tagline"
              maxLength={120}
              onSave={(next) => edit((s) => ({ ...s, storefront: { ...s.storefront, tagline: next } }))}
            />
          </div>

          <div className="divide-y divide-border border-y border-border">
            <LinkRow href="/seller/store" icon={<Sparkles />} label="Change my store" />
            <LinkRow href={`/s/${shop.slug}`} icon={<Store />} label="View my store" />
          </div>
        </div>
      )}
      <div className="mt-auto px-4 pt-2 pb-5">
        <Link
          href="/visit/home"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 w-full justify-center rounded-xl text-[15px]")}
        >
          <Repeat />
          Switch to buying
        </Link>
      </div>
    </div>
  );
}
