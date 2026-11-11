# Design contract

Read this before building any screen. The look must be clean and premium, with very little text. One product, not five apps.

## Principles

1. **One message per screen.** A reader should get the point in three seconds. Headlines are 6 words or fewer. Supporting lines are 12 words or fewer. Cut any label, helper text or caption the screen still works without.
2. **One primary action per view.** Crimson is rare. It marks the single main action, the active nav item, focus rings and the key chart line. It is never decoration and never signals an error.
3. **Whitespace does the work.** Hairline borders (`border-border`), no shadows at rest, no gradients on surfaces, no boxes inside boxes. Use `shadow-lift` only on hover or floating elements.
4. **Ink panels carry the drama.** Large feature panels and the sign-in brand panel use `bg-ink text-ink-foreground`. Never use large crimson or glacier fills.
5. **Numbers look engineered.** Money and metrics use `tabular-nums`. Order IDs, SKUs and pickup codes use `font-mono`.
6. **Things arrive, they don't jump.** Use `animate-rise` for entering content and `transition-colors duration-150` for hover. Keep motion subtle.

## Two profiles

The product is Deal4Me. It has two phone apps, one for each profile. Both render in `PhoneFrame` with a four-tab bar. Each profile's Profile screen has a clear switch to the other profile, so one phone can demo both.

**Buyer, `/visit/*`.** Tabs: Home, Chat, Messages, Profile.
- Home: a search bar and the "Find it for me" action. Search results at `/visit/search`.
- Chat: talks to the AI agent, which finds items and negotiates whenever the buyer wants or picks an item. Chats are saved, listed at `/visit/chats`, and can be reopened.
- Messages: the buyer and seller talking. A thread opens only once they agree on a deal. Its id is the negotiation id. Screens at `/visit/messages` and `/visit/messages/[threadId]`.
- Profile: name, language, card, bookings (`/visit/trips`), switch to selling.

**Seller, `/seller/*`.** Tabs: Listings, Scan, Messages, Profile.
- Listings: everything the store lists, with editing.
- Scan: point the camera at an item or upload a photo, get an estimated price, list it.
- Messages: the same threads as the buyer sees, for this store. Screens at `/seller/messages` and `/seller/messages/[threadId]`.
- Profile: the seller's and store's details, and `/seller/store` to change the store by speaking, typing or uploading pictures. Switch to buying.

Shared contracts: `useThreads`, `useMessages` and `useUnreadCount` from `@/lib/messages`; `useSellerShop` from `@/lib/seller`.

Real data: all data is real and comes from the backend, and the store starts empty until it loads (`useHydrated`). Real shops can have a blank owner name, neighborhood or photo, so never print a stray "·" or "'s", and use `thumbFor` for item pictures. Show `error.message` when a call fails. There is no mock data, so never add any.

## Visitor app

Language of the visitor app:

- White screens (`bg-card`), hairline dividers between groups, and light rows in `bg-muted/60` with `rounded-xl`, instead of bordered cards.
- Inner screens start with `ScreenHeader` from `@/components/shared/ScreenHeader`. Deal screens continue with `ItemSummary`.
- Glacier is the visitor's own agent: the active segment, the visitor's chat bubble (`bg-info-soft`), the sparkle avatar, and quiet links such as "Earlier rounds". The other side's bubble is `bg-muted`. Crimson stays reserved for the one main action, the active tab, and the slider fill.
- Primary buttons are full width, 48px tall, `rounded-xl`, with 17px semibold text.
- Each screen fits in one 390x844 view without scrolling, including when the status bar and tab bar are showing in the device frame.
- Photos: `PHOTOS` and `thumbFor()` from `@/lib/photos`.

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

Sentence case, plain, short. No emoji, no exclamation marks, no marketing filler ("seamless", "powerful", "unlock"). Money shows in whole dollars ($40), with cents only when the price has them. Deposits always read "held, not charged". Only fictional people and businesses. No real logos, University of Utah marks, or the word "Olympic". The product name comes from `BRAND` in `src/lib/brand.ts`, because it will change.

## Art

Item art lives at `/demo/items/<itemId>.svg`, upload samples at `/demo/uploads/upload-01.svg` to `upload-12.svg`, shop heroes at `/demo/heroes/<shopId>.svg`, and brand art at `/brand/ridge-dark.svg` and `/brand/ridge-light.svg`. The Wasatch ridgeline is the one recurring brand motif. Use it sparingly.

## Stack notes

- Next.js 16 with React 19 and Tailwind v4. `params` and `searchParams` are Promises in server components. In client components use `useParams()` and `useSearchParams()` (wrap the latter in `<Suspense>`). Guides are in `node_modules/next/dist/docs/`.
- shadcn here is built on Base UI, so there is **no `asChild`**. For a link styled as a button use `<Link className={buttonVariants()}>`, or the `render` prop.
- Filenames: PascalCase for our components (`src/components/shared/PhoneFrame.tsx`), kebab-case for shadcn (`src/components/ui/`).
- State: `useStore` from `@/lib/store`, `api` from `@/lib/api`, `money()` and `orderNumber()` from `@/lib/format`. Show order IDs through `orderNumber()`, never raw.
- `cn()` treats our custom sizes (`text-label`, `text-title` and so on) as text colors and drops them when a color class is also present. Write those class lists as a plain string.
