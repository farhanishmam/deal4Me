# Seller backend integration

Implemented only in `src/lib/real/{describe,website,photos,onboarding-records}.ts`; no UI/components/pages were edited. Claude is concurrently changing the UI.

- Description and pasted menu use `/api/ai/describe`; website URLs use `/api/ai/restyle` (missing protocol gains `https://`).
- A single extracted item works. Empty results and server failures stop the import; no canned inventory is inserted.
- Stated prices are preserved, including fractional dollars. Missing prices use `/api/ai/suggest-price`.
- Photos use `/api/ai/appraise` with kind `rental` for local sellers and `food` for businesses. Uploaded photos are resized, converted to durable JPEG data URLs, and saved with inventory.
- Every completed import awaits `saveShop(shop, items)` before committing frontend inventory or reporting success.
- Manual `upsertShop` changes now persist through a serialized per-shop queue. Canonical responses bypass the queue, stale responses preserve newer edits, and failed saves retain a retryable snapshot. `getPendingShopIds` lets server hydration preserve unsaved edits.
- Existing order status changes through `upsertOrder` now persist in workflow order through a per-order queue. Newly created orders are not submitted twice. `getPendingOrderIds` protects pending statuses during hydration.
- Publishing waits for pending shop edits, uses the server's canonical publication time, and reports failures with a retry action.

UI follow-ups for Claude/root:

1. `DescribeFlow.tsx` currently has `mockMic` and `onUnavailable: mockMic`, which inject a sample transcript when transcription fails. Show an actionable voice error and allow typing instead.
2. `PhotosView.tsx` / `photos/model.ts` currently import `UPLOAD_SAMPLES` / `referenceSuggestion`, and silently use `saleSuggestionFor` after a pricing failure. Remove these fallbacks; keep the error visible and allow a manual sale price. Existing SVG samples cannot be appraised as real photos.
3. Description/menu items have no photo unless the source supplies one. Use the UI's empty-photo state instead of inventing photos or passing an empty src to Next Image.
4. Show backend error messages on import/description/photo failures; the new adapters propagate them.
5. Shop rename/publishing persistence is handled in the store/catalog integration; no UI changes needed for those existing actions.
6. `EditableItemCard.tsx` reads/writes only `item.priceCents`; rental items need `item.rental.dailyFeeCents` to avoid displaying $0 and silently ignoring rental edits.
7. `DashboardView.tsx` still has Maya's hardcoded greeting/shop id, and `dashboard/demo-series.ts` still seeds earnings. The store now uses real data, so those presentation assumptions need to be removed by the UI owner.

Manual inputs:

- `/sell/describe`: `My shop is called Juniper Gear. I rent snowshoes for $18 per day, a blue ski jacket for $12 per day, and sell ski goggles for $45.`
- Single-item case: `My shop is called Summit Snacks. I sell vegetable burritos for $9.`
- Missing-price case: `My shop is called Aspen Gear. I rent a pair of adult snowshoes in good condition. Suggest a fair daily price.`
- `/sell/import`, pasted menu: `Juniper Kitchen\nVegetable burrito - $9\nChicken taco - $4.50\nHorchata - $3`.
- `/sell/photos?kind=local`: choose actual JPG/PNG/WebP/GIF photos of one item per image, for example a pair of skis, a helmet, or snowshoes. Business photo mode accepts real dish photos and asks the backend for menu pricing.
- Error case: submit text with no item (`Hello`) or an unavailable website; it should fail without adding a canned shop.
