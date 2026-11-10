type BuyerIntent = "offer" | "accept" | "other";

export const JPY_PER_USD = 150;

const KD: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const KU: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

function jaNum(s: string): number {
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") num = num * 10 + Number(ch);
    else if (KD[ch]) num = KD[ch];
    else if (KU[ch]) {
      section += (num || 1) * KU[ch];
      num = 0;
    } else if (ch === "万") {
      total += (section + num || 1) * 10000;
      section = 0;
      num = 0;
    }
  }
  return total + section + num;
}

function tokenValue(tok: string): number {
  const t = tok.replace(/,/g, "");
  return /^[\d.]+$/.test(t) ? parseFloat(t) : jaNum(t);
}

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

// First run of English number words, with whether a dollar word follows it.
function wordNumber(text: string): { value: number; marked: boolean } | null {
  const toks = text.split(/[\s-]+/).map((t) => t.replace(/[^a-z]/g, ""));
  for (let i = 0; i < toks.length; i++) {
    if (!(toks[i] in UNITS) && toks[i] !== "hundred") continue;
    let cur = 0;
    let j = i;
    let n = 0;
    for (; j < toks.length; j++) {
      const t = toks[j];
      if (t in UNITS) cur += UNITS[t];
      else if (t === "hundred") cur = (cur || 1) * 100;
      else if (t === "and" && (toks[j + 1] in UNITS || toks[j + 1] === "hundred")) continue;
      else break;
      n++;
    }
    const marked = /^(dollars?|bucks?|usd)$/.test(toks[j] ?? "");
    if (n === 1 && cur === 1 && !marked) continue;
    if (cur > 0) return { value: cur, marked };
  }
  return null;
}

const NUM = "[0-9][0-9,]*(?:\\.\\d+)?|[一二三四五六七八九十百千万][0-9一二三四五六七八九十百千万,]*";
const DURATION =
  /\d+(?:\.\d+)?\s*(?:days?|weeks?|hours?|hrs?|minutes?|mins?|months?|years?|日|週間|週|時間|分|か月|ヶ月|年)/g;

// Only a message that is nothing but an acceptance counts. "No deal" and "sure, but lower?" go to the classifier.
const ACCEPT = /^(?:deal|ok|okay|sure|yes|yep|yeah|i accept|sounds good|it's a deal|はい|いいですよ|了解です?|それで(?:お願いします|いいです)|お願いします)$/;
const FILLER = /[\s.!?,~。！？、]+/g;
// A bare number next to these is a head count, a size or another currency, not dollars a day.
const FOREIGN_CURRENCY = /원|\bwon\b(?!')|元|\byuan\b|\brmb\b|\bkrw\b|\beuros?\b|\beur\b|€|\bpesos?\b|£|\bpounds?\b|\bcny\b/;
const NOT_MONEY = /(?<![\d.])\d[\d,]*(?:\.\d+)?\s*(?:people|persons?|guys|kids|adults|children|friends|of us|items?|pairs?|sets?|km|miles?|cm|kg|lbs?|%|percent|a\.?m\.?|p\.?m\.?|人|名|個|枚|本)/;

const toCents = (usd: number) => Math.round(usd) * 100;

export function parseOffer(message: string): {
  intent: BuyerIntent;
  offerCents: number | null;
  confident: boolean;
} {
  const text = message.normalize("NFKC").toLowerCase().replace(DURATION, " ");
  const found = (usd: number | null) => {
    if (usd === null || !(usd >= 0.5)) return null;
    return { intent: "offer" as const, offerCents: toCents(usd), confident: true };
  };

  const yen = text.match(new RegExp(`(${NUM})\\s*(?:円|yen|jpy)`)) ?? text.match(new RegExp(`[¥￥]\\s*(${NUM})`));
  if (yen) {
    const r = found(tokenValue(yen[1]) / JPY_PER_USD);
    if (r) return r;
  }

  const usd =
    text.match(new RegExp(`\\$\\s*(${NUM})`)) ??
    text.match(new RegExp(`(${NUM})\\s*(?:dollars?|bucks?|usd|ドル|\\$)`));
  if (usd) {
    const r = found(tokenValue(usd[1]));
    if (r) return r;
  }

  if (FOREIGN_CURRENCY.test(text) || NOT_MONEY.test(text)) return { intent: "other", offerCents: null, confident: false };

  const words = wordNumber(text);
  if (words?.marked) {
    const r = found(words.value);
    if (r) return r;
  }

  const bare = text.match(/(?<![\d.])\d[\d,]*(?:\.\d+)?/);
  if (bare) {
    const r = found(tokenValue(bare[0]));
    if (r) return r;
  }

  if (words) {
    const r = found(words.value);
    if (r) return r;
  }

  if (ACCEPT.test(text.replace(FILLER, " ").trim())) return { intent: "accept", offerCents: null, confident: true };
  return { intent: "other", offerCents: null, confident: !/\p{L}/u.test(text) };
}
