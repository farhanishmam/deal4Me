# Listing photo sources

Downloaded November 6, 2026 for the requested ski listing imagery. These are distinct source photographs, not crops or recolors of one image. Stock photos illustrate the rental packages; owner-uploaded photos take priority. Files are served locally so the demo does not depend on a remote image service.

The owner's supplied `/listings/ski-gear.png` is the cover for Sport / Basic Ski Package only. Its existing three-photo gallery is retained.

| Local file | Listing / use | Photographer and source |
| --- | --- | --- |
| `ski/pexels-6113888.jpg` | Sport / Basic Skis Only | Lukas Schulz, [Skis on the Snow](https://www.pexels.com/photo/skis-on-the-snow-6113888/) |
| `ski/pexels-257961.jpg` | Performance Ski Package | Pixabay, [Flatlay of Skiing Equipment](https://www.pexels.com/photo/flatlay-of-skiing-equipment-257961/) |
| `ski/unsplash-OKa6B9tbt2o.jpg` | Performance Skis Only | Darien Attridge, [Skis standing upright in fresh snow](https://unsplash.com/photos/skis-standing-upright-in-fresh-snow-with-trees-OKa6B9tbt2o) |
| `ski/unsplash-9Osc8kG7LeY.jpg` | Demo / High Performance Ski Package | Karsten Winegeart, [Goggled Up](https://unsplash.com/photos/a-pair-of-skis-sitting-on-top-of-snow-covered-ground-9Osc8kG7LeY) |
| `ski/unsplash-zmGEOFxXNDE.jpg` | Demo / High Performance Skis Only | nhxl bdl, [Skis and poles on a snowy slope](https://unsplash.com/photos/skis-and-poles-rest-on-a-snowy-slope-zmGEOFxXNDE) |
| `ski/pexels-39895408.jpg` | Touring Ski Package | Maël BALLAND, [Freeride equipment against a stone wall](https://www.pexels.com/photo/39895408/) |
| `ski/pexels-10957169.jpg` | Junior Ski Package | Octavian Iordache, [A Young Kid Skiing](https://www.pexels.com/photo/a-young-kid-skiing-on-a-snow-covered-ground-10957169/) |
| `ski/pexels-19822708.jpg` | Junior Performance Ski Package | Maheshwaran Shanmugam, [Child Skiing in Snow](https://www.pexels.com/photo/child-skiing-in-snow-19822708/) |
| `ski/pexels-11156951.jpg` | Junior Skis Only | Hurrah suhail, [Child Learning how to Ski](https://www.pexels.com/photo/child-learning-how-to-ski-11156951/) |
| `ski/pexels-19535148.jpg` | Junior Performance Skis Only | Osman Arabacı, [Child on a Ski Slope](https://www.pexels.com/photo/child-on-a-ski-slope-19535148/) |
| `ski/pexels-14846103.jpg` | Additional ski import fallback | Valentin Angel Fernandez, [Skiing Equipment in Winter](https://www.pexels.com/photo/skiing-equipment-in-winter-14846103/) |
| `ski/pexels-28199263.jpg` | Snowboard import fallback | Sergio Zhukov, [Snowboards near Advertisement](https://www.pexels.com/photo/a-snowboard-is-sitting-on-top-of-a-tent-28199263/) |
| `ski/unsplash-aGe00J3SuEc.jpg` | Additional distinct scanned ski listing cover | Spencer Plouzek, [Skis and poles resting on snow](https://unsplash.com/photos/skis-and-poles-resting-on-snow-aGe00J3SuEc) |
| `ski/pexels-11169835.jpg` | Additional distinct scanned ski listing cover | Irina Zimno, [A Person Wearing Snow Skis](https://www.pexels.com/photo/a-person-wearing-snow-skis-on-snow-covered-ground-11169835/) |
| `ski/unsplash-4fMr2hAC78U.jpg` | Additional distinct ski and boot set cover | Clay Banks, [Ski boots and equipment organized on a wall](https://unsplash.com/photos/ski-boots-and-equipment-organized-on-a-wall-4fMr2hAC78U) |
| `ski/pexels-36350616.jpg` | Additional distinct scanned ski listing cover | Petra Nesti, [Colorful Skis in Park City](https://www.pexels.com/photo/colorful-skis-in-park-city-at-ski-resort-36350616/) |
| `ski/unsplash-3naP9D9JX1s.jpg` | Additional distinct ski and boot set cover | LOGAN WEAVER, [Red ski boots and skis on snow](https://unsplash.com/photos/red-ski-boots-and-skis-on-snow-with-roses-3naP9D9JX1s) |

Pexels photos are available under the [Pexels License](https://www.pexels.com/license/), which permits free website/app use. Pixabay's flatlay is marked CC0 on its Pexels source page. The listed Unsplash photographs are free under the [Unsplash License](https://unsplash.com/license), not Unsplash+ images. People and brands pictured do not endorse this app.

Existing owner/demo-upload images `/demo/photos/skis.jpg` and `/demo/photos/rent-gear.jpg` remain assigned to Black skis and Ski and boot set respectively; their original image-appraisal bytes are preserved.

For repeated uploads of those exact same sample photographs, a separate stock cover is assigned and the uploaded original stays in that listing's gallery. Run `node scripts/backfill-gear-photos.mjs http://localhost:3000 --distinct-covers` to apply and verify these catalog assignments without changing prices, sizes, or availability.
