import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface SiteItem {
  name: string;
  description: string;
  category: string;
  kind: "food" | "rental" | "sale";
  priceUsd: number | null;
  photoUrl?: string;
}

export class RestyleInputError extends Error {}
export class WebsiteReadError extends Error {}

function privateAddress(address: string): boolean {
  const host = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (host.includes(":")) {
    if (host.startsWith("::ffff:")) {
      const tail = host.slice(7);
      if (tail.includes(".")) return privateAddress(tail);
      const parts = tail.split(":");
      if (parts.length === 2) {
        const value = parseInt(parts[0], 16) * 65536 + parseInt(parts[1], 16);
        return privateAddress([value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join("."));
      }
      return true;
    }
    return host === "::" || host === "::1" || /^(fc|fd|fe[89ab]|ff)/.test(host);
  }
  const [a, b] = host.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 198 && (b === 18 || b === 19));
}

export function parseSiteUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new RestyleInputError("Enter a full web address, like https://example.com");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!/^https?:$/.test(url.protocol) || url.username || url.password ||
    (url.port && url.port !== "80" && url.port !== "443") ||
    host === "localhost" || !host.includes(".") && !isIP(host) ||
    /\.(local|localhost|internal|home\.arpa)$/.test(host) ||
    isIP(host) && privateAddress(host)) {
    throw new RestyleInputError("Use a public website address");
  }
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url;
}

async function checkPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) {
    throw new RestyleInputError("Use a public website address");
  }
}

/** Fetch only public HTML; validate each redirect and bound both time and memory. */
export async function fetchSitePage(raw: string): Promise<{ html: string; url: string }> {
  let url = parseSiteUrl(raw);
  const signal = AbortSignal.timeout(12_000);
  try {
    for (let redirect = 0; redirect <= 5; redirect++) {
      await checkPublicHost(url);
      const response = await fetch(url, {
        signal,
        redirect: "manual",
        cache: "no-store",
        headers: { "user-agent": "Mozilla/5.0 (compatible; StorefrontImport/1.0)", accept: "text/html,application/xhtml+xml" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirect === 5) throw new WebsiteReadError("That website redirects too many times. Paste a direct menu or shop link.");
        url = parseSiteUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new WebsiteReadError(response.status === 403 || response.status === 429
          ? "That website blocks imports. Paste your menu instead."
          : `That website returned ${response.status}. Check the link or paste your menu.`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        await response.body?.cancel();
        throw new WebsiteReadError("Use a website page with items, or paste your menu.");
      }
      if (!response.body) throw new WebsiteReadError("That website returned an empty page.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      let html = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 2_000_000) throw new WebsiteReadError("That page is too large. Paste a direct menu or shop link.");
          html += decoder.decode(value, { stream: true });
        }
        html += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
      }
      if (!html.trim()) throw new WebsiteReadError("That website returned an empty page.");
      return { html, url: url.href };
    }
  } catch (error) {
    if (error instanceof RestyleInputError || error instanceof WebsiteReadError) throw error;
    throw new WebsiteReadError(signal.aborted
      ? "That website took too long. Try again or paste your menu."
      : "Could not reach that website. Check the link or paste your menu.");
  }
  throw new WebsiteReadError("Could not read that website.");
}

export function decodeText(value: string): string {
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">", ndash: "–", mdash: "—", pound: "£", euro: "€" };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, key: string) => {
    if (key.startsWith("#")) {
      const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return entities[key.toLowerCase()] ?? match;
  });
}

export const plainText = (value: string): string => decodeText(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), decodeText(match[2] ?? match[3] ?? match[4] ?? "")]));
}

export function siteMeta(html: string, name: string): string {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((attrs.property ?? attrs.name)?.toLowerCase() === name.toLowerCase()) return attrs.content ?? "";
  }
  return "";
}

function publicImage(value: unknown, base: string): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const candidate = first && typeof first === "object" ? (first as Record<string, unknown>).url : first;
  if (typeof candidate !== "string" || !candidate.trim()) return undefined;
  try { return parseSiteUrl(new URL(candidate, base).href).href; } catch { return undefined; }
}

function property(html: string, name: string): string {
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b[^>]*\bitemprop\s*=\s*["'][^"']+["'][^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!attrs.itemprop?.split(/\s+/).includes(name)) continue;
    if (attrs.content) return attrs.content;
    if (name === "image") return attrs.src ?? attrs.href ?? "";
    const rest = html.slice((match.index ?? 0) + match[0].length);
    return plainText(rest.slice(0, rest.search(new RegExp(`</${match[1]}\\s*>`, "i"))));
  }
  return "";
}

function priceUsd(raw: unknown, currency: unknown): number | null {
  if (typeof currency === "string" && currency && currency.toUpperCase() !== "USD") return null;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const number = typeof raw === "number" ? raw : Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function categoryFor(html: string): string {
  const heading = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].at(-1)?.[1];
  return heading ? plainText(heading).split(/\s*\/\s*/).at(-1)?.slice(0, 80) || "Items" : "Items";
}

/** Use the site's own product records before asking AI to interpret visible text. */
export function structuredSiteItems(html: string, base: string): SiteItem[] {
  const items: SiteItem[] = [];
  const category = categoryFor(html);
  const add = (item: SiteItem) => {
    if (item.name && !items.some((previous) => previous.name.toLowerCase() === item.name.toLowerCase())) items.push(item);
  };
  const visit = (value: unknown, depth = 0) => {
    if (depth > 20 || !value || typeof value !== "object" || items.length >= 12) return;
    if (Array.isArray(value)) { value.slice(0, 200).forEach((child) => visit(child, depth + 1)); return; }
    const record = value as Record<string, unknown>;
    const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    if (types.some((type) => typeof type === "string" && /(?:^|\/)(Product|MenuItem)$/i.test(type))) {
      const offerValue = Array.isArray(record.offers) ? record.offers[0] : record.offers;
      const offer = offerValue && typeof offerValue === "object" ? offerValue as Record<string, unknown> : {};
      const price = record.priceSpecification && typeof record.priceSpecification === "object" ? record.priceSpecification as Record<string, unknown> : {};
      if (typeof record.name === "string") add({
        name: plainText(record.name).slice(0, 200),
        description: typeof record.description === "string" ? plainText(record.description).slice(0, 1000) : "",
        category: typeof record.category === "string" ? plainText(record.category).slice(0, 80) : category,
        kind: types.some((type) => typeof type === "string" && /(?:^|\/)MenuItem$/i.test(type)) ? "food" : "sale",
        priceUsd: priceUsd(offer.price ?? offer.lowPrice ?? record.price ?? price.price, offer.priceCurrency ?? record.priceCurrency ?? price.priceCurrency),
        photoUrl: publicImage(record.image, base),
      });
    }
    Object.values(record).forEach((child) => visit(child, depth + 1));
  };
  for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(script[1])); } catch { /* Some sites ship malformed optional metadata. */ }
  }
  const starts = [...html.matchAll(/<[a-z][^>]*\bitemtype\s*=\s*["']https?:\/\/schema\.org\/(Product|MenuItem)["'][^>]*>/gi)];
  starts.forEach((match, index) => {
    const block = html.slice(match.index, starts[index + 1]?.index);
    add({
      name: property(block, "name").slice(0, 200),
      description: property(block, "description").slice(0, 1000),
      category: property(block, "category").slice(0, 80) || category,
      kind: match[1].toLowerCase() === "menuitem" ? "food" : "sale",
      priceUsd: priceUsd(property(block, "price"), property(block, "priceCurrency")),
      photoUrl: publicImage(property(block, "image"), base),
    });
  });
  return items.slice(0, 12);
}

export function pageFacts(html: string, base: string) {
  const body = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const title = plainText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const description = plainText(siteMeta(html, "description") || siteMeta(html, "og:description"));
  const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((match) => plainText(match[1])).filter(Boolean);
  const visible = body.replace(/<\/(?:p|div|li|h[1-6]|tr|section|article)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
    .split("\n").map(plainText).filter((line) => line.length > 1 && line.length < 400);
  const images = [...body.matchAll(/<img\b[^>]*>/gi)].flatMap((match) => {
    const attrs = attributes(match[0]);
    const url = publicImage(attrs["data-src"] || attrs.src, base);
    return url && !/(?:logo|favicon|icon)/i.test(`${attrs.alt ?? ""} ${url}`) ? [{ alt: attrs.alt ?? "", url }] : [];
  }).slice(0, 40);
  return {
    title,
    description,
    name: plainText(siteMeta(html, "og:site_name")) || title.split(/\s*[|–—]\s*/).at(-1) || new URL(base).hostname,
    text: [`title: ${title}`, `description: ${description}`, ...headings.slice(0, 25).map((heading) => `heading: ${heading.slice(0, 100)}`)].join("\n"),
    // Keep prices beside their item names, including repeated prices and copy.
    bodyText: visible.slice(0, 350).join("\n").slice(0, 18_000),
    images,
    hero: /(?:logo|favicon|icon)/i.test(siteMeta(html, "og:image")) ? undefined : publicImage(siteMeta(html, "og:image"), base),
  };
}
