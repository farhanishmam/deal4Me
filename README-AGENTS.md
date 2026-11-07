# Ownership map

Read `DESIGN.md` first. Edit only your own paths. Shared changes go in `NOTES-WPx.md` at the repo root.

| Package | Paths |
| --- | --- |
| WP1 Onboarding | `src/app/sell/{start,import,photos,describe}`, `src/components/onboarding` |
| WP2 Storefront | `src/app/sell/studio`, `src/app/s`, `src/components/storefront` |
| WP3 Visitor core | `src/app/visit/page.tsx`, `src/app/visit/{home,agent,item,order,trips,profile}`, `src/components/visitor` |
| WP4 Deals and money | `src/app/visit/{negotiate,checkout,rentals,receipt}`, `src/app/sell/rentals`, `src/components/deals` |
| WP5 Dashboard and demo | `src/app/page.tsx`, `src/app/sign-in`, `src/app/sell/{dashboard,setup}`, `src/app/demo`, `src/components/{dashboard,demo,marketing}` |
| WP6 Real AI | `src/lib/real/ai.ts`, `src/app/api/ai`, `src/server/ai` |
| WP7 Real deals and payments | `src/lib/real/deals.ts`, `src/app/api/{deals,payments}`, `src/server/{deals,payments}` |

Everything else belongs to WP0.
