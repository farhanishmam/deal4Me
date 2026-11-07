import Link from "next/link";

const GROUPS: { title: string; routes: [string, string, string][] }[] = [
  {
    title: "Front door",
    routes: [
      ["L1", "Landing", "/"],
      ["A1", "Seller sign-in", "/sign-in"],
    ],
  },
  {
    title: "Seller",
    routes: [
      ["S1", "Start selling", "/sell/start"],
      ["S2", "Website import", "/sell/import"],
      ["S3", "Photo import", "/sell/photos"],
      ["S4", "Describe by voice or text", "/sell/describe"],
      ["S5", "Storefront Studio", "/sell/studio/mayas-gear"],
      ["S7", "Launch checklist", "/sell/setup/mayas-gear"],
      ["S8", "Seller dashboard", "/sell/dashboard"],
      ["S9", "Return check", "/sell/rentals/rental-seed-1"],
    ],
  },
  {
    title: "Storefronts",
    routes: [
      ["P1", "Maya's Gear Garage", "/s/mayas-gear"],
      ["P1", "Canyon Taco Co.", "/s/canyon-taco"],
      ["P1", "Second Chair Coffee", "/s/second-chair"],
      ["P1", "Theo's Ski Closet", "/s/theos-closet"],
    ],
  },
  {
    title: "Visitor",
    routes: [
      ["V1", "Welcome and trip setup", "/visit"],
      ["V2", "Discover", "/visit/home"],
      ["V3", "Agent chat", "/visit/agent"],
      ["V4", "Gear item", "/visit/item/mg-skis"],
      ["V5", "Negotiation", "/visit/negotiate/mg-skis?days=3"],
      ["V6", "Checkout", "/visit/checkout/mg-skis?days=3"],
      ["V7", "Rental status", "/visit/rentals/rental-seed-1"],
      ["V8", "Food order", "/visit/order/canyon-taco"],
      ["V9", "Receipt", "/visit/receipt/rental-seed-1"],
      ["V10", "Trips", "/visit/trips"],
      ["V10", "Profile", "/visit/profile"],
    ],
  },
  {
    title: "Table mode",
    routes: [
      ["D1", "Table mode", "/demo"],
      ["D2", "Step log", "/demo/log"],
    ],
  },
];

export default function DevIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-8">
      <h1 className="text-title">Route index</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-eyebrow uppercase text-muted-foreground">{group.title}</h2>
            <ul className="mt-3 divide-y rounded-xl border bg-card">
              {group.routes.map(([id, name, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-muted"
                  >
                    <span className="w-8 font-mono text-xs text-muted-foreground">{id}</span>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
