"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemEditor } from "@/components/seller/listings/ItemEditor";
import { money } from "@/lib/format";
import { thumbFor } from "@/lib/photos";
import { useSellerShop } from "@/lib/seller";
import { useStore } from "@/lib/store";
import type { Item, ItemRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const scanClass = cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-xl text-[17px] font-semibold");

function priceLine(item: Item): string {
  if (item.kind === "rental" && item.rental) return `${money(item.rental.dailyFeeCents)} / day`;
  if (item.priceCents !== undefined) return money(item.priceCents);
  return "";
}

function when(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function day(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function windowLine(item: Item): string {
  if (item.availableFrom && item.availableUntil) return `${when(item.availableFrom)} – ${when(item.availableUntil)}`;
  if (item.availableFrom) return `From ${when(item.availableFrom)}`;
  if (item.availableUntil) return `Until ${when(item.availableUntil)}`;
  return "";
}

function Row({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const price = priceLine(item);
  const window = windowLine(item);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-primary/15"
      >
        <Image
          src={thumbFor(item)}
          alt=""
          width={96}
          height={96}
          unoptimized
          className={cn("size-12 shrink-0 rounded-xl bg-muted object-cover", !item.available && "opacity-50")}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[16px] font-medium", !item.available && "text-muted-foreground")}>
            {item.name}
          </span>
          {price && <span className="block text-[14px] text-muted-foreground">{price}</span>}
          {window && <span className="block text-[13px] text-muted-foreground">{window}</span>}
          {!!item.sizes?.length && <span className="block truncate text-[13px] text-muted-foreground">Sizes: {item.sizes.join(", ")}</span>}
        </span>
        {!item.available && <span className="w-14 shrink-0 text-right text-[13px] text-muted-foreground">Not available</span>}
      </button>
    </li>
  );
}

async function confirmRequest(id: string): Promise<ItemRequest> {
  const res = await fetch("/api/data/requests", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, status: "confirmed" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Could not confirm (${res.status})`);
  return body as ItemRequest;
}

function RequestRow({ request, item }: { request: ItemRequest; item?: Item }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const detail = [
    request.kind === "rental" ? "Rent" : "Buy",
    request.size,
    request.startsAt ? `${day(request.startsAt)}${request.endsAt ? ` – ${day(request.endsAt)}` : ""}` : "",
    request.agreedPriceCents !== undefined ? `Agreed ${money(request.agreedPriceCents)}${request.kind === "rental" ? " / day" : ""}` : "",
  ].filter(Boolean).join(" · ");
  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      useStore.getState().upsertItemRequest(await confirmRequest(request.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm");
      setBusy(false);
    }
  };
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{item?.name ?? "Item request"}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{detail}</span>
        </span>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className={cn(buttonVariants({ size: "sm" }), "h-9 shrink-0 rounded-lg px-4 text-[14px] font-semibold")}
        >
          {busy ? "Confirming..." : "Confirm"}
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-[13px] text-destructive">{error}</p>}
    </li>
  );
}

export function ListingsView() {
  const { hydrated, shop, items } = useSellerShop();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const allRequests = useStore((state) => state.itemRequests);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-[15px] text-muted-foreground">Loading your store...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="max-w-[260px] text-[16px] text-muted-foreground">You don&apos;t have a store yet.</p>
        <Link href="/sell/start" className="text-[16px] font-semibold text-primary">
          Set up your store
        </Link>
      </div>
    );
  }

  const editing = editingId ? items.find((i) => i.id === editingId) : undefined;
  if (editing) return <ItemEditor key={editing.id} item={editing} onClose={() => setEditingId(null)} />;

  const name = shop.name.trim() || "Your store";
  const hero = shop.storefront.heroPhotoUrl;
  const count = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  const term = search.trim().toLowerCase();
  const shownItems = [...items].reverse().filter((item) => !term || [item.name, item.category, item.description, ...(item.sizes ?? [])].join(" ").toLowerCase().includes(term));
  const requests = allRequests.filter((request) => request.shopId === shop.id && request.status === "requested");

  return (
    <div className="flex flex-1 flex-col bg-card">
      <header className="flex items-center gap-3 px-4 pt-4 pb-4">
        {hero ? (
          <Image src={hero} alt="" width={96} height={96} unoptimized className="size-12 shrink-0 rounded-full bg-muted object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-[18px] font-semibold text-muted-foreground"
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-bold tracking-[-0.018em]">{name}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-[14px] text-muted-foreground">
            {shop.liveAt && (
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-semibold text-success">Live</span>
            )}
            <span>{count}</span>
          </p>
        </div>
      </header>

      <div className="px-4 pb-3">
        <Link href="/seller/scan" className={scanClass}>
          Scan an item
        </Link>
      </div>

      {!!requests.length && (
        <section aria-labelledby="buyer-requests" className="mx-4 mb-3 border-y border-border py-2">
          <h2 id="buyer-requests" className="text-[14px] font-semibold text-muted-foreground">Buyer requests</h2>
          <ul className="mt-1 divide-y divide-border">
            {requests.map((request) => (
              <RequestRow key={request.id} request={request} item={items.find((entry) => entry.id === request.itemId)} />
            ))}
          </ul>
        </section>
      )}

      {!!items.length && (
        <div className="relative mx-4 mb-2">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Find your listing"
            placeholder="Find your listing"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 rounded-xl border-transparent bg-muted/60 pl-9 text-[15px]"
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="px-6 py-10 text-center text-[15px] text-muted-foreground">Nothing listed yet. Scan your first item.</p>
      ) : (
        <ul className="flex flex-col px-2 pb-4">
          {shownItems.map((item) => (
            <Row key={item.id} item={item} onOpen={() => setEditingId(item.id)} />
          ))}
          {!shownItems.length && <li className="px-4 py-8 text-center text-[15px] text-muted-foreground">No matching listings.</li>}
        </ul>
      )}
    </div>
  );
}
