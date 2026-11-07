# Design contract

Read this before building any screen. The look must be clean and premium, with very little text. One product, not five apps.

## Principles

1. **One message per screen.** A reader should get the point in three seconds. Headlines are 6 words or fewer. Supporting lines are 12 words or fewer. Cut any label, helper text or caption the screen still works without.
2. **One primary action per view.** Crimson is rare. It marks the single main action, the active nav item, focus rings and the key chart line. It is never decoration and never signals an error.
3. **Whitespace does the work.** Hairline borders (`border-border`), no shadows at rest, no gradients on surfaces, no boxes inside boxes. Use `shadow-lift` only on hover or floating elements.
4. **Ink panels carry the drama.** Large feature panels and the sign-in brand panel use `bg-ink text-ink-foreground`. Never use large crimson or glacier fills.
5. **Numbers look engineered.** Money and metrics use `tabular-nums`. Order IDs, SKUs and pickup codes use `font-mono`.
6. **Things arrive, they don't jump.** Use `animate-rise` for entering content and `transition-colors duration-150` for hover. Keep motion subtle.

## Structure references

Copy the structure and density of these, not their colors, brand names, data or copy:

- `/private/tmp/claude-501/-Users-farhanishmam-GitHub-Projects-hackathon/86b1c858-45e6-4541-90b5-943c4c81541c/images/1.webp`: seller dashboard. Left sidebar with wordmark, active item as a soft tint, account card pinned to the bottom. Greeting over page title, search plus one CTA on the right. Four KPI tiles, chart card plus side list, then a table with status pills.
- `/private/tmp/claude-501/-Users-farhanishmam-GitHub-Projects-hackathon/86b1c858-45e6-4541-90b5-943c4c81541c/images/2.webp`: storefront. Top bar with shop identity, wide search, order total. Left rail with nav and categories. A row of four "reorder" cards, three large feature panels, then a four-column product grid (image, name, mono SKU, price, availability pill, quantity stepper, full-width CTA). Floating "Ask" pill bottom right.
- `/private/tmp/claude-501/-Users-farhanishmam-GitHub-Projects-hackathon/86b1c858-45e6-4541-90b5-943c4c81541c/images/3.webp`: sign-in. Split screen: dark brand panel on the left (logo, eyebrow pill, big headline, one line, three check bullets), form on the right, footer strip.

## Tokens

Use Tailwind classes only. No hex values outside storefront themes and the art files.

| Role | Classes |
| --- | --- |
| Page, surface | `bg-background`, `bg-card` |
| Text | `text-foreground`, `text-muted-foreground` |
| Lines | `border-border` |
| Main action | `bg-primary text-primary-foreground hover:bg-primary-hover` |
| Active or selected tint | `bg-primary-soft text-primary` |
| Ink panel | `bg-ink`, `bg-ink-raised`, `text-ink-foreground`, `text-ink-muted`, `border-ink-border` |
| Status pills | `bg-success-soft text-success`, `bg-warning-soft text-warning-text`, `bg-info-soft text-info`, `bg-destructive-soft text-destructive`, `bg-muted text-foreground` |
| Quiet fill, hover | `bg-muted` |

Glacier blue (`info`, `secondary`) appears only in status pills and as the second chart series. Do not use the shadcn `secondary` button variant. Use `outline` for secondary actions.

## Type

Public Sans everywhere, JetBrains Mono for IDs, SKUs and codes.

| Style | Class | Use |
| --- | --- | --- |
| Display | `text-display` (`text-[40px]` on phones) | Landing and sign-in headline only |
| Title | `text-title` | Page title, one per page |
| Heading | `text-heading` | Card and section titles |
| Body | `text-sm`, `text-[15px]` on phone screens | Everything else |
| Label | `text-label text-muted-foreground` | Field labels, KPI labels, table headers |
| Metric | `text-metric tabular-nums` | KPI values |
| Eyebrow | `text-eyebrow uppercase text-muted-foreground` | Rare section markers |

Never use a weight above 700 or sizes outside this list, apart from a large pickup code.

## Layout and spacing

- 4-point spacing. Page padding 32px on desktop, 16px on phones. Card padding 20 to 24px. Grid gaps 16px, section gaps 32px. Content max width 1280px.
- Cards: `rounded-xl border bg-card`. Large ink panels: `rounded-2xl`. Buttons and inputs: `rounded-lg`. Pills: `rounded-full`.
- Primary buttons are 40px tall by default, 48px for full-width form CTAs. Touch targets on phones are at least 44px.
- This is a demo. Only two viewports matter: **1710x1107** (the presenter's Mac, full screen) and **390x844** (iPhone 12 Pro). Each screen must look great at those two sizes. Ignore every other size, and don't spend time on tablets or other breakpoints.

## Copy

Sentence case, plain, short. No emoji, no exclamation marks, no marketing filler ("seamless", "powerful", "unlock"). Money shows as dollars ($40), never cents. Deposits always read "held, not charged". Only fictional people and businesses. No real logos, University of Utah marks, or the word "Olympic". The product name comes from `BRAND` in `src/lib/brand.ts`, because it will change.

## Art

Item art lives at `/demo/items/<itemId>.svg`, upload samples at `/demo/uploads/upload-01.svg` to `upload-12.svg`, shop heroes at `/demo/heroes/<shopId>.svg`, and brand art at `/brand/ridge-dark.svg` and `/brand/ridge-light.svg`. The Wasatch ridgeline is the one recurring brand motif. Use it sparingly.

## Data contract

Shop IDs, which are also their slugs: `canyon-taco`, `second-chair`, `mayas-gear`, `theos-closet`.

| Shop | Item IDs |
| --- | --- |
| Canyon Taco Co. | `ct-carne-asada`, `ct-al-pastor`, `ct-baja-fish`, `ct-burrito`, `ct-taco-plate`, `ct-nachos`, `ct-horchata`, `ct-jamaica` |
| Second Chair Coffee | `sc-breakfast-burrito`, `sc-avocado-toast`, `sc-granola`, `sc-latte`, `sc-cold-brew`, `sc-mocha`, `sc-croissant`, `sc-cinnamon-roll` |
| Maya's Gear Garage | `mg-skis`, `mg-boots`, `mg-jacket`, `mg-snowshoes` |
| Theo's Ski Closet | `tc-snowboard`, `tc-goggles` |

Seed records: rental `rental-seed-1`, food orders `order-seed-1` to `order-seed-4`, negotiation `neg-seed-1`.

## Stack notes

- Next.js 16 with React 19 and Tailwind v4. `params` and `searchParams` are Promises in server components. In client components use `useParams()` and `useSearchParams()` (wrap the latter in `<Suspense>`). Guides are in `node_modules/next/dist/docs/`.
- shadcn here is built on Base UI, so there is **no `asChild`**. For a link styled as a button use `<Link className={buttonVariants()}>`, or the `render` prop.
- Filenames: PascalCase for our components (`src/components/shared/PhoneFrame.tsx`), kebab-case for shadcn (`src/components/ui/`).
- State: `useStore` from `@/lib/store`, `api` from `@/lib/api`, `money()` and `orderNumber()` from `@/lib/format`. Show order IDs through `orderNumber()`, never raw.
- `cn()` treats our custom sizes (`text-label`, `text-title` and so on) as text colors and drops them when a color class is also present. Write those class lists as a plain string.
