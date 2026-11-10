"use client";

import { House, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { useUnreadCount } from "@/lib/messages";
import { useStore } from "@/lib/store";
import { AppTabBar } from "./AppTabBar";

const LABELS = {
  en: { home: "Home", chat: "Chat", messages: "Messages", profile: "Profile" },
  ja: { home: "ホーム", chat: "チャット", messages: "メッセージ", profile: "プロフィール" },
} as const;

/** Buyer tabs. Chat is the AI agent; Messages is the buyer and seller talking after a deal. */
export function VisitorTabBar() {
  const language = useStore((s) => s.visitor.language);
  const unread = useUnreadCount("buyer");
  const labels = LABELS[language === "ja" ? "ja" : "en"];

  return (
    <AppTabBar
      tabs={[
        { href: "/visit/home", label: labels.home, icon: House, fill: true, match: ["/visit/home", "/visit/search", "/visit/item", "/visit/order"] },
        { href: "/visit/agent", label: labels.chat, icon: Sparkles, fill: true, match: ["/visit/agent", "/visit/chats", "/visit/negotiate", "/visit/checkout"] },
        { href: "/visit/messages", label: labels.messages, icon: MessageCircle, fill: true, unread, match: ["/visit/messages"] },
        { href: "/visit/profile", label: labels.profile, icon: UserRound, fill: true, match: ["/visit/profile", "/visit/trips", "/visit/rentals", "/visit/receipt"] },
      ]}
    />
  );
}
