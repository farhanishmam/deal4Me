# Local marketplace

The app uses the real Next.js API routes by default. No mock-mode environment variable is needed, and backend failures do not substitute demo inventory or responses.

Run `npm install` and `npm run dev`, then open the URL printed by Next.js. The current development session is at `http://localhost:3001`.

AI requests use the installed Claude Agent SDK. The running development session has successfully returned real description, search, and negotiation responses. For a fresh session, supply `ANTHROPIC_API_KEY` in `.env.local` or authenticate the Claude CLI with `claude auth login`, then restart the server. For microphone input, run `npm run stt` in another terminal; typed queries work independently.

Voice input shows an updating transcript while you speak. Tap the microphone again to finish, review or edit the completed text, then select the screen's submit action. Recording never automatically builds, searches, or applies an instruction.

Ski packages use distinct local photographs when an import has no picture. The first package keeps the supplied gear photo and a multi-image gallery. Listings can store multiple images in `photoUrls`; item details show thumbnails and gallery navigation. Photo credits are in `public/listings/SOURCES.md`.

Follow [DEMO-WORKFLOW.md](DEMO-WORKFLOW.md) for the seller-to-buyer walkthrough, rental and sale estimates, availability, and date/size requests.

## Try it

Start at `/sell/describe`, select **Or type it**, and enter:

> My shop is Wasatch Gear. I rent all-mountain skis for $45 per day, ski boots for $20 per day, and a ski jacket for $15 per day.

Build the storefront, review its items, then select **Go live**. Only published inventory appears in visitor searches. Open `/visit/home` and try:

- `Find all-mountain skis under $50 per day`
- `Find ski boots under $25 per day`
- `I need skis for 3 days under $150`
- `スキー板を3日間借りたい。予算は150ドル`

To try food, create and publish a second shop with:

> My shop is Cedar Tacos. I sell fish tacos for $5 and lemonade for $3.

Then search for `Find fish tacos under $6` or `Find lemonade under $4`. Food orders and seller status changes are saved on the server. You can also paste a menu at `/sell/import`, or upload actual JPEG, PNG, WebP, or GIF photos at `/sell/photos`.

Search interprets item names, categories, language, duration, and daily versus total budgets. A three-day rental under $150 is checked against three times its daily fee. Negotiation prices and limits come from saved owner terms, rather than visitor-supplied prices. Negotiation runs two private Haiku agents through Claude Code, one for the owner who sees only the floor and one for the buyer who sees only their maximum, which share only the public chat; `src/server/deals/rules.ts` limits every action and price they can choose, so a deal always lands between the floor and the buyer's maximum.

## Persistence and limits

Catalog, item requests, orders, and negotiations persist in ignored `.data/` JSON files. `RIDGE_DATA_DIR` can point to a different writable directory. Browser storage keeps preferences and local activity; server records load on other browsers and refresh on focus and every 15 seconds. New workspaces start empty.

This server is a single local workspace. Account authentication and per-seller access control are not implemented. File persistence is intended for one Node process, rather than a multi-instance deployment.

Date/size requests are inquiries awaiting seller confirmation. Rental checkout currently uses a simulated payment ledger; it does not charge a card or move money. Remaining UI integration notes for the concurrent UI work are in `NOTES-WP0-INTEGRATION.md` and `NOTES-WP1-INTEGRATION.md`.

## Checks

Run `npx tsc --noEmit --incremental false` and `npm run lint`. Integration checks exercised real Claude description/search/negotiation responses, authoritative prices and budgets, persisted shop publication and orders, order status transitions, and explicit payment errors using isolated temporary data.
