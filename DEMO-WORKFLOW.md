# Seller and buyer walkthrough

Open the running app at `http://localhost:3000`. Use the URL printed by Next.js if the port changes. Run `npm run stt` in another terminal for voice input and allow microphone access.

## 1. Seller: create the store

Start at `/sell/start`. Choose **Just tell us** and record this, or choose the typing option:

> I run Juniper Gear, a ski rental shop near campus. All-mountain skis rent for thirty five dollars a day, and ski and boot sets rent for forty five dollars a day.

The transcript updates as you speak. Stop recording, review or edit the completed text, then choose **Build my storefront**. Review the extracted listings and choose **Go live**. **Open my listings** opens the new store's inventory.

The same start screen offers photo uploads and website imports. `/seller/profile` edits the seller's name, store name, neighborhood, and tagline. Its store selector chooses which store to manage.

## 2. Seller: price an item and set availability

Open the **Scan** tab (`/seller/scan`), or choose **Scan an item** at `/seller/listings`. Upload a ski photo. The result shows separate **Rent** and **Buy** estimates with ranges and reasoning. Choose a mode, adjust the price if needed, and list it. Actual new uploads use the backend appraisal service.

At `/seller/listings`, find the item by name and open it. Set:

- Availability: on.
- Available from/until: a future window, for example November 10–20, 2026.
- Sizes: `160 cm, 170 cm, 180 cm` for skis, or `S, M, L` for clothing.

Save the changes. The editor also offers **Get a fair price**, which returns rental and sale estimates for gear. The seller controls the final listed price.

## 3. Buyer: find the uploaded item

Choose **Switch to buying** in the seller profile, or open `/visit/home`. Try:

> Find all-mountain skis under $50 per day.

> I need a ski and boot set for 3 days under $150.

> Find junior ski packages.

> スキー板を3日間借りたい。予算は150ドル。

Results come from published backend inventory. Voice input lets the buyer review the transcript before submitting a search. Prices and availability are read from the saved catalog.

Tap **Dates & size** on the result card to open the request form directly, or open the item to review its photos, availability window, and sizes and choose **Choose dates & size**. Enter pickup and return times inside the seller's window, choose `170 cm`, and send the request. For the example above, November 11 at 9 AM through November 13 at 9 AM is a two-day rental. Use future dates when rehearsing later.

Unavailable items remain visible with their status, and requests outside the seller's dates or sizes are rejected. A sale listing instead offers **Request this item** with the desired time and size.

## 4. Seller: see the buyer's request

Open `/seller/listings` for the same store. **Buyer requests** shows the requested item, dates, size, and status. The buyer can also see the saved request at `/visit/trips`. A rental request's success screen offers **Negotiate this request**.

Requests persist on the backend and await seller confirmation. Sending one does not reserve inventory or charge a card. Checkout uses a simulated payment ledger. The hold starts at the requested pickup time when it fits the seller's window, otherwise when the window opens, so send a dated request before negotiating to book a specific time.

## Listing photos

Each current ski listing has a distinct cover. Sport / Basic Ski Package uses the supplied photograph and retains a three-photo gallery. Package-specific fallback photos are local assets, so the demo does not depend on remote image loading. See [photo sources](public/listings/SOURCES.md).
