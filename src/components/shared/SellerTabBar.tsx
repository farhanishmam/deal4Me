"use client";

import { LayoutGrid, MessageCircle, ScanLine, UserRound } from "lucide-react";
import { useUnreadCount } from "@/lib/messages";
import { AppTabBar } from "./AppTabBar";

/** Seller tabs: what's listed, scan a new item, talk to buyers, and the seller's profile and store. */
export function SellerTabBar() {
  // No accounts yet, so the seller profile answers every deal, whichever store it's on.
  const unread = useUnreadCount("seller");

  return (
    <AppTabBar
      tabs={[
        { href: "/seller/listings", label: "Listings", icon: LayoutGrid, fill: true, match: ["/seller/listings"] },
        { href: "/seller/scan", label: "Scan", icon: ScanLine, match: ["/seller/scan"] },
        { href: "/seller/messages", label: "Messages", icon: MessageCircle, fill: true, unread, match: ["/seller/messages"] },
        { href: "/seller/profile", label: "Profile", icon: UserRound, fill: true, match: ["/seller/profile", "/seller/store"] },
      ]}
    />
  );
}
