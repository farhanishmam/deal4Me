"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

type Route = [string, string];

const GROUPS: { title: string; routes: Route[] }[] = [
  {
    title: "Front door",
    routes: [
      ["Landing", "/"],
      ["Sign in", "/sign-in"],
    ],
  },
  {
    title: "Buyer phone",
    routes: [
      ["Home", "/visit/home"],
      ["Search results", "/visit/search"],
      ["Chat", "/visit/agent"],
      ["Saved chats", "/visit/chats"],
      ["Messages", "/visit/messages"],
      ["Profile", "/visit/profile"],
      ["Bookings", "/visit/trips"],
    ],
  },
  {
    title: "Seller phone",
    routes: [
      ["Listings", "/seller/listings"],
      ["Scan", "/seller/scan"],
      ["Messages", "/seller/messages"],
      ["Profile", "/seller/profile"],
      ["Change the store", "/seller/store"],
    ],
  },
  {
    title: "Seller desktop",
    routes: [
      ["Start selling", "/sell/start"],
      ["Website import", "/sell/import"],
      ["Photo import", "/sell/photos"],
      ["Describe by voice or text", "/sell/describe"],
      ["Dashboard", "/sell/dashboard"],
    ],
  },
];

function Group({ title, routes }: { title: string; routes: Route[] }) {
  if (routes.length === 0) return null;
  return (
    <section>
      <h2 className="text-eyebrow uppercase text-muted-foreground">{title}</h2>
      <ul className="mt-3 divide-y rounded-xl border bg-card">
        {routes.map(([name, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-muted"
            >
              <span className="min-w-0 truncate">{name}</span>
              <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">{href}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function DevIndex() {
  const shops = useStore((s) => s.shops);

  // Real ids, read from the saved state at runtime.
  const stores: Route[] = shops.flatMap((shop) => [
    [shop.name.trim() || shop.slug, `/s/${shop.slug}`] as Route,
    [`${shop.name.trim() || shop.slug}, studio`, `/sell/studio/${shop.id}`] as Route,
  ]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 py-12 md:px-8">
      <h1 className="text-title">Route index</h1>
      <div className="mt-8 grid min-w-0 gap-8 md:grid-cols-2">
        {GROUPS.map((group) => (
          <Group key={group.title} {...group} />
        ))}
        <Group title="Your stores" routes={stores} />
      </div>
    </main>
  );
}
