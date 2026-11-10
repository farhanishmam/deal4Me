# Ski and taco onboarding demos

The start screen is `/sell/start`. It has three entry points and no business/local selector. Each flow offers a ski example and a taco example. Imports save inventory on the backend; the success screen waits for publication before displaying the public link and QR code.

## Before presenting

Keep the app running with `npm run dev` and speech transcription running in another terminal with `npm run stt`. The speech model is already downloaded on this machine. Use localhost or HTTPS, allow microphone access, and rehearse one recording before presenting.

Run `npm run demo:prepare` to warm and verify both websites, both descriptions, and all three sample photos. It defaults to this machine's app at `http://localhost:3001`. Pass a different app URL if needed: `npm run demo:prepare -- http://localhost:3000`. The preparation script uses Node 22.18 or newer. It does not create or publish shops.

Website and description results are saved in `.data/ai-cache` and survive app restarts. Uploaded-photo appraisals are also cached. Keep `.data` in place for the presentation; it is intentionally ignored by Git. A fresh machine needs one preparation run with the AI service connected through its existing Claude login or `ANTHROPIC_API_KEY`. The genuine sample image appraisals are included in the repository. New websites, descriptions, and photos still use real processing and show errors when processing fails.

## Import a website

Open **Import my website**, then choose either sample button:

- **Try a ski shop:** [Wasatch Ski & Snowboard Rental](https://wasatchskiandsnowboardrental.com/ski-rentals/). Imports the actual daily rental listings and source prices.
- **Try a taco menu:** [Ranchero Tacos](https://www.rancherotacos.com/). Imports the actual menu and source prices.

You can also paste any public website or a menu. Sample websites retain their source identity and content. The saved extraction replays consistently instead of fetching and analyzing the website again on every demo run. Prices are a captured source snapshot, not a promise of current pricing.

## Use photos

Open **Snap up to 12 photos**, then choose **Try ski photos** or **Try taco photos**:

| Sample | Local JPEG | Captured price |
| --- | --- | --- |
| Skis | `public/demo/photos/skis.jpg` | $35/day |
| Ski and boot set | `public/demo/photos/rent-gear.jpg` | $45/day |
| Taco plate | `public/demo/photos/find-food.jpg` | $12 |

These are real photos with appraisals captured from successful live image requests. The backend recognizes their exact image bytes; unrelated uploads cannot receive these sample results. The sample UI labels prepared prices. Choose Gear or Food for your own uploads, up to 12 images, then review prices and build the storefront.

The optional **Sell it** toggle uses prepared demo sale prices of $180 for the skis and $260 for the set. Those sale values are authored examples; the rental and food sample appraisals are captured AI results.

## Record a description

Open **Just tell us**, expand **View demo scripts**, and choose **Ski shop** or **Taco truck**. Tap the microphone, speak the selected script, then tap again to stop. The app records actual audio, provides playback, and transcribes it. Review the transcript and choose **Build my storefront**, then **Go live**.

**Ski shop**

> I run Juniper Gear, a ski rental shop near campus. Skis rent for thirty five dollars a day, and ski and boot sets rent for forty five dollars a day.

The result is Juniper Gear with two rentals at $35/day and $45/day.

**Taco truck**

> I run Canyon Taco Co., a taco truck near campus. Carne asada tacos are four dollars, the burrito is eleven dollars, horchata is four dollars, and nachos are nine dollars.

The result is Canyon Taco Co. with four items at $4, $11, $4, and $9.

Both scripts were tested through real speech transcription and real extraction. Minor known transcription spellings map to their saved extraction. Changing a price or adding an item processes the new description separately. **Use this description** fills the text field for a typing demonstration; it does not pretend to record audio.

## Visitor search loading fix

The visitor agent's loading bubble now wraps within the phone width. A stalled request times out with a retry message, and resetting a chat discards old responses. Repeated searches reuse real AI interpretation keyed to the query and catalog content; availability and prices are checked against the current backend catalog on every request.
