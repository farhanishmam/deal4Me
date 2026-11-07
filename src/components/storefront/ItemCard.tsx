"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { money } from "@/lib/format";
import type { Item } from "@/lib/types";
import { fill, type Dict } from "./i18n";

/** "ct-carne-asada" -> "CT-CARNE-ASADA" */
export function skuFor(itemId: string): string {
  return itemId.toUpperCase();
}

export function ItemCard({
  item,
  t,
  index,
  preview,
  onAdd,
}: {
  item: Item;
  t: Dict;
  index: number;
  preview: boolean;
  onAdd: (itemId: string, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const isRental = item.kind === "rental";
  const isFood = item.kind === "food";
  const price = isRental ? (item.rental?.dailyFeeCents ?? 0) : (item.priceCents ?? 0);
  const href = `/visit/item/${item.id}`;

  const add = () => {
    onAdd(item.id, qty);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1400);
    setQty(1);
  };

  const hold = (e: React.MouseEvent) => {
    if (preview) e.preventDefault();
  };

  return (
    <article className="sf-card" style={{ "--i": Math.min(index, 8) } as React.CSSProperties}>
      <div className="sf-art">
        <Image
          src={item.photoUrl}
          alt={item.name}
          width={800}
          height={600}
          unoptimized
          sizes="(min-width: 1100px) 280px, 50vw"
        />
        <span className={`sf-pill${item.available ? "" : " is-off"}`}>
          <i aria-hidden />
          {item.available ? t.available : t.unavailable}
        </span>
      </div>

      <div className="sf-card-text">
        <h3 className="sf-item-name">{item.name}</h3>
        <p className="sf-sku">{skuFor(item.id)}</p>
      </div>

      <div className="sf-card-foot">
        <div className="sf-price-row">
          <p className="sf-price">
            {money(price)}
            {isRental && <span>{t.day}</span>}
          </p>
          {isFood && item.available && (
            <div className="sf-step" role="group" aria-label={item.name}>
              <button type="button" aria-label="-" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus />
              </button>
              <span aria-live="polite">{qty}</span>
              <button type="button" aria-label="+" disabled={qty >= 20} onClick={() => setQty((q) => Math.min(20, q + 1))}>
                <Plus />
              </button>
            </div>
          )}
        </div>
        {isRental && item.rental && (
          <p className="sf-deposit">{fill(t.deposit, { amount: money(item.rental.depositCents) })}</p>
        )}

        {isFood ? (
          <button type="button" className={`sf-cta${added ? " is-done" : ""}`} onClick={add} disabled={!item.available}>
            {added ? (
              <>
                <Check /> {t.added}
              </>
            ) : (
              t.add
            )}
          </button>
        ) : item.available ? (
          <Link href={href} className="sf-cta" onClick={hold}>
            {isRental ? t.rent : t.buy}
          </Link>
        ) : (
          <span className="sf-cta is-disabled" aria-disabled>
            {t.unavailable}
          </span>
        )}
      </div>
    </article>
  );
}
