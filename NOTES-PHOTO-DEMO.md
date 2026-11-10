# Photo onboarding demo

Open `/sell/photos` and choose **Try ski photos** or **Try taco photos**. Each sample set chooses rental or food pricing automatically. Both sets use actual local JPEGs, call the same `/api/ai/appraise` backend as uploads, and save the inventory through `/api/data/shops` before showing success.

- `/demo/photos/skis.jpg`: skis, **$35/day**, $280 deposit held, not charged.
- `/demo/photos/rent-gear.jpg`: ski and boot set, **$45/day**, $360 deposit held, not charged.
- `/demo/photos/find-food.jpg`: beef street taco plate, **$12**.

All three appraisals were captured from successful live Claude image requests on November 6, 2026. Their genuine item identities, condition, prices, ranges, and reasoning are committed in `src/server/ai/demo-photo-appraisals.json`. Exact image SHA-256 and kind select those snapshots, so renaming an arbitrary upload cannot return a prepared result. Responses expose `basis: "demo"` and `demoSource: "captured_ai"`. The sample UI explicitly labels prepared demo prices.

Switching a sample to **Sell it** calls the image backend again and returns a prepared sample sale price ($180 for skis, $260 for the set). These sale values are authored demo prices and expose `demoSource: "prepared"`; they are not represented as live market research.

Up to 12 real JPG, PNG, WebP, or GIF uploads use real image appraisal. Select **Gear** or **Food** in the upload pane to choose daily rental or menu pricing. Successful results are cached by image bytes, kind, media type, and seller hint in `.data/ai-cache/photo-appraisals` (or `RIDGE_DATA_DIR`). Unknown images never receive the sample inventory. Errors stay visible; sale pricing failures permit a manual price without inventing a fallback.

The start screen needs no business/local choice; both sample sets are always available. Legacy `/sell/photos?kind=business` preselects food uploads.

Validation: all three live image requests succeeded in about 4–5 seconds each; repeated exact-image demo requests returned immediately with the same captured prices; sample sale appraisal succeeded; SVG upload returned HTTP 415. Targeted ESLint passed. Root owns full app type/build checks and browser verification.
