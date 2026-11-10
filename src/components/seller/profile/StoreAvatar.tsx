import Image from "next/image";
import type { Shop } from "@/lib/types";

function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

/** The store picture, or its initials while there is no picture yet. */
export function StoreAvatar({ shop, size = 72 }: { shop: Pick<Shop, "name" | "storefront">; size?: number }) {
  const photo = shop.storefront.heroPhotoUrl;
  return (
    <span
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[22px] font-semibold text-primary"
    >
      {photo ? <Image src={photo} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" /> : initialsOf(shop.name)}
    </span>
  );
}
