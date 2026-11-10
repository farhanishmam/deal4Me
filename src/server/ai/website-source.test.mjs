import assert from "node:assert/strict";
import test from "node:test";
import { pageFacts, parseSiteUrl, structuredSiteItems } from "./website-source.ts";

const origin = "https://example.com/menu";

test("reads nested menu JSON-LD without inventing prices or changing currency", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@graph": [{
      "@type": "Menu",
      hasMenuItem: [
        { "@type": "https://schema.org/MenuItem", name: "Chips &amp; salsa", description: "House salsa", offers: { price: "6.50", priceCurrency: "USD" }, image: { url: "/photos/chips.jpg" } },
        { "@type": "MenuItem", name: "Taco", offers: { price: "4", priceCurrency: "CAD" } },
        { "@type": "MenuItem", name: "Special" },
      ],
    }],
  })}</script>`;
  const items = structuredSiteItems(html, origin);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], { name: "Chips & salsa", description: "House salsa", category: "Items", kind: "food", priceUsd: 6.5, photoUrl: "https://example.com/photos/chips.jpg" });
  assert.equal(items[1].priceUsd, null);
  assert.equal(items[2].priceUsd, null);
});

test("keeps product names, prices and image URLs paired in microdata", () => {
  const html = `<h1>Computers / Laptops</h1>
    <article itemscope itemtype="https://schema.org/Product"><img itemprop="image" src="/one.jpg"><span itemprop="price">$416.99</span><meta itemprop="priceCurrency" content="USD"><a itemprop="name">Model &quot;One&quot;</a><p itemprop="description">15-inch laptop</p></article>
    <article itemscope itemtype="https://schema.org/Product"><img itemprop="image" src="/two.jpg"><span itemprop="price">$306.99</span><meta itemprop="priceCurrency" content="USD"><a itemprop="name">Model Two</a><p itemprop="description">Compact laptop</p></article>`;
  const items = structuredSiteItems(html, origin);
  assert.deepEqual(items.map(({ name, priceUsd, photoUrl, category }) => ({ name, priceUsd, photoUrl, category })), [
    { name: 'Model "One"', priceUsd: 416.99, photoUrl: "https://example.com/one.jpg", category: "Laptops" },
    { name: "Model Two", priceUsd: 306.99, photoUrl: "https://example.com/two.jpg", category: "Laptops" },
  ]);
});

test("rejects local, private, credentialed and non-web addresses", () => {
  for (const url of ["http://localhost", "http://127.1", "http://0x7f000001", "http://10.0.0.1", "http://100.64.0.1", "http://169.254.169.254", "http://192.168.1.1", "http://[::1]", "http://[::ffff:127.0.0.1]", "http://[::ffff:7f00:1]", "http://[fc00::1]", "file:///tmp/menu", "https://user:pass@example.com", "https://example.com:8888"]) {
    assert.throws(() => parseSiteUrl(url), undefined, url);
  }
});

test("normalizes demo tracking while preserving distinct catalog queries", () => {
  assert.equal(parseSiteUrl("https://example.com/menu?utm_source=demo&category=food#items").href, "https://example.com/menu?category=food");
  assert.notEqual(parseSiteUrl("https://example.com/menu?category=food").href, parseSiteUrl("https://example.com/menu?category=gear").href);
});

test("reads metadata in either attribute order and keeps logos out of hero art", () => {
  const facts = pageFacts('<title>Menu | Sample cafe</title><meta content="Fresh food" name="description"><meta content="/logo.png" property="og:image">', origin);
  assert.equal(facts.name, "Sample cafe");
  assert.equal(facts.description, "Fresh food");
  assert.equal(facts.hero, undefined);
});

test("preserves source order and repeated prices when preparing AI context", () => {
  const facts = pageFacts("<h4>First taco</h4><p>$4.00</p><h4>Second taco</h4><p>$4.00</p>", origin);
  assert.equal(facts.bodyText, "First taco\n$4.00\nSecond taco\n$4.00");
});
