# Integration handoff for concurrent UI work

The user explicitly requested the real frontend/backend integration without mock defaults. The app's `api` export contains the real adapters only. There is no mock toggle and no silent mock fallback. Keep the current layouts; these notes concern functional bindings.

**Ownership boundary:** integration owns `src/lib/api.ts`, `src/lib/store.ts`, `src/lib/store-hydrator.tsx`, `src/lib/real/**`, `src/lib/*-sync.ts`, and `src/server/**`/`src/app/api/**`. Please do not restore `mockApi`, `buildSeed`, `NEXT_PUBLIC_USE_MOCK`, or simulated fallback behavior in these files while doing UI development. New workspaces intentionally start empty. Use the explicit example inputs in README to create actual backend inventory.

Server contracts:

- `GET /api/data/state` supplies saved `shops`, `items`, `orders`, and `rentals`; `GET /api/deals/negotiations` supplies negotiations.
- Imports call `saveShop(shop, items)` and wait for durable storage. New shops are drafts; `useStore.publishShop(id)` persists publication and onboarding timing. Existing UI `upsertShop` edits are queued and persisted, including rename, theme, reorder, and undo. `upsertOrder` status changes are persisted in workflow order.
- `useHydrated()` waits for preferences and initial server data. Only published shops (`liveAt`) participate in search and negotiations. The store starts empty and does not read the old seeded local-storage key.
- Catalog persistence ingests canonical records without recursively saving them. Refresh preserves pending local shop/order changes. Failed saves show a toast with Retry and retain the desired edit.
- API errors carry real server messages. Payment hold and settlement endpoints return 501 until a provider is configured. The UI must not show a payment success after that response.
- Production palette presets live in `src/lib/storefront-themes.ts`; `mock-data.ts` reexports them for compatibility.

UI integration tasks to complete in Claude's current UI work:

1. Seller navigation/dashboard: replace `mayas-gear`/Maya hardcoding in `SellerShell`, `DashboardView`, and `StorefrontCard` with an actual store shop and its slug. Empty workspaces should link to `/sell/start`. Replace the fabricated `DAILY_DOLLARS` earnings baseline with totals from actual transactions.
2. Voice integration is complete: seller Describe, visitor Ask, and studio AskPanel show real live transcript updates, stop for final transcription, and wait for explicit submission. Studio's fake mic fallback and voice auto-submit are removed. Errors preserve the editable draft and recording.
3. Seller photo pricing: remove mock `saleSuggestionFor`, sample SVG imports, and silent pricing fallback. Real raster uploads and backend appraisal are supported. A price request failure should permit a manual price and display the error. `model.ts` already appears to be changing in the UI work; keep its exports/imports synchronized with `PhotosView`.
4. Rental price editing: `EditableItemCard` must read/write `rental.dailyFeeCents` for rental items; `priceCents` applies to sale/food. Description imports can have no photo, so show an empty image state.
5. Rental durations: honor backend `card.actions[].href` (including `?days=N`) in `AgentCards`, and query duration in `ItemDetail`; current UI still substitutes fixed durations.
6. Error presentation: use `error.message` in `NegotiateScreen`, `CheckoutView`, `OrderFlow`, and `ReturnCheckView`. Remove simulated-payment/test-card confirmation copy from checkout; real payment support is unavailable. `ItemDetail` sale reservation currently uses a local timeout and needs a real operation or a disabled/unavailable action.
7. Publication: success is meaningful only when the saved shop has `liveAt`. `SuccessMoment` currently renders its success text before the async publication action resolves; use publication state/error to avoid premature success.
8. Photos and metadata: ski gear with missing photos now receives the user-supplied `/listings/ski-gear.png` on both server and client; existing ski records have persisted galleries. `Item.photoUrls` supplies additional distinct photos and ItemPhotoGallery renders them. Other description/menu imports can still have `photoUrl: ""`; use a neutral no-photo placeholder rather than an empty Next Image src or `/demo/heroes/<newShopId>.svg`, which does not exist. New sellers have no ratings or neighborhood yet; avoid presenting `0.0` as a real review score. `OrderFlow` creates an order without charging money; its Pay/Test 4242 wording must reflect that. Sign-in currently redirects to the local workspace rather than authenticating.

Before the UI ownership update, the visitor sub-agent changed only `Ask`, its strings, `chatStore`, `PhotoStep`, and one obsolete `RentalStatusView` prop. Those changes removed fake listening/seed links and replaced condition-photo samples with uploads. No further UI files were edited by the integration agents.

Test recipes and local setup are in `README.md`. Do not restore mock records when a query returns no matches: create and publish matching inventory first.
