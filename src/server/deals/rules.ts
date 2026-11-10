// Guardrails for the two negotiating agents. The agents choose an action and a price;
// these rules decide which actions are allowed, clamp every price, and close the deal.
// Pure and import-free, so node --test can load it directly.

// All prices are integer cents and whole dollars after normalisation.
const D = 100;
const EPS = 1e-9;

export const ceilDollar = (cents: number): number => Math.ceil(cents / D - EPS) * D;
export const floorDollar = (cents: number): number => Math.floor(cents / D + EPS) * D;
export const wholeDollars = (cents: number): number => Math.round(cents / D) * D;

export type OwnerAction = "accept" | "counter" | "hold" | "walk";
export type VisitorAction = "accept" | "offer";

// round = buyer offers answered so far. The opening is round 1 of maxRounds.
export interface DealState {
  listCents: number;
  floorCents: number;
  askCents: number;
  round: number;
  maxRounds: number;
}

export function newDealState(listCents: number, floorCents: number, maxRounds = 6): DealState {
  // Prices such as 1999 are shown and negotiated as whole dollars, so the list is normalised once here.
  const list = Math.max(D, wholeDollars(listCents));
  const floor = Math.min(Math.max(0, ceilDollar(floorCents)), list);
  return { listCents: list, floorCents: floor, askCents: list, round: 0, maxRounds };
}

// Five buyer offers and six owner messages at most when maxRounds is 6.
const isFinal = (round: number, maxRounds: number): boolean => round + 2 >= maxRounds;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export type OwnerInput =
  | { kind: "offer"; offerCents: number; previousOfferCents: number | null }
  | { kind: "accept" }
  | { kind: "chat" };

export interface OwnerOptions {
  allowed: OwnerAction[];
  acceptCents: number;
  counterMinCents: number;
  counterMaxCents: number;
  final: boolean;
  /** Whether this turn answers a buyer offer and so uses up a round. */
  advances: boolean;
}

/**
 * The buyer's agent repeats one price every turn, so "agent" mode lets the owner walk once a repeated offer is still below the floor.
 * "manual" never does: a human can keep typing numbers, and a forced walk would reveal the floor.
 */
export function ownerOptions(state: DealState, input: OwnerInput, mode: "agent" | "manual" = "agent"): OwnerOptions {
  const ask = state.askCents;
  const floor = state.floorCents;
  const final = isFinal(state.round, state.maxRounds);
  const base = { acceptCents: ask, counterMinCents: ask, counterMaxCents: ask, final, advances: false };

  if (input.kind === "chat") return { ...base, allowed: ["hold"] };
  if (input.kind === "accept") return { ...base, allowed: ["accept"] };

  const offer = input.offerCents;
  const previous = input.previousOfferCents;
  const advancing = { ...base, advances: true };
  if (offer >= ask) return { ...advancing, allowed: ["accept"] };
  if (final) return { ...advancing, acceptCents: offer, allowed: offer >= floor ? ["accept"] : ["walk"] };

  const counterMin = Math.max(floor, offer + D, ceilDollar(ask - 0.6 * (ask - offer)));
  const counterMax = floorDollar(ask - 1);
  const allowed: OwnerAction[] = [];
  if (offer >= floor) allowed.push("accept");
  if (counterMin <= counterMax) allowed.push("counter");
  allowed.push("hold");
  if (mode === "agent" && previous !== null && offer <= previous && offer < floor) allowed.push("walk");
  return { ...advancing, acceptCents: offer, counterMinCents: counterMin, counterMaxCents: counterMax, allowed };
}

export interface OwnerOutcome {
  move: OwnerAction;
  priceCents: number;
  next: DealState;
  /** The negotiation ended: accept means deal, walk means no deal. */
  closes: boolean;
}

export function applyOwner(state: DealState, options: OwnerOptions, action: OwnerAction, priceCents: number): OwnerOutcome | null {
  if (!options.allowed.includes(action)) return null;
  const round = state.round + (options.advances ? 1 : 0);
  const done = (move: OwnerAction, price: number, closes: boolean, askCents = state.askCents): OwnerOutcome => ({
    move,
    priceCents: price,
    next: { ...state, askCents, round },
    closes,
  });
  switch (action) {
    case "accept":
      return done("accept", options.acceptCents, true);
    case "counter": {
      const wanted = Number.isFinite(priceCents) ? priceCents : options.counterMinCents;
      const price = clamp(wholeDollars(wanted), options.counterMinCents, options.counterMaxCents);
      return done("counter", price, false, price);
    }
    case "hold":
      return done("hold", state.askCents, false);
    case "walk":
      return done("walk", state.askCents, true);
  }
}

export interface VisitorParams {
  askCents: number;
  /** The price the visitor picked. The buyer's agent offers exactly this and never any other price. */
  maxCents: number;
  round: number;
  maxRounds: number;
}

export interface VisitorOptions {
  allowed: VisitorAction[];
  offerMinCents: number;
  offerMaxCents: number;
  acceptCents: number;
  final: boolean;
}

export function visitorOptions(p: VisitorParams): VisitorOptions {
  const price = floorDollar(Math.max(0, p.maxCents));
  const final = isFinal(p.round, p.maxRounds);
  // Taking an ask at or below the picked price is the one case where the buyer pays less than the picked price.
  if (p.askCents <= price) return { allowed: ["accept"], offerMinCents: price, offerMaxCents: price, acceptCents: p.askCents, final };
  return { allowed: ["offer"], offerMinCents: price, offerMaxCents: price, acceptCents: p.askCents, final };
}

export interface VisitorOutcome {
  move: VisitorAction;
  priceCents: number;
  closes: boolean;
}

export function applyVisitor(options: VisitorOptions, action: VisitorAction, priceCents: number): VisitorOutcome | null {
  if (!options.allowed.includes(action)) return null;
  if (action === "accept") return { move: "accept", priceCents: options.acceptCents, closes: true };
  const wanted = Number.isFinite(priceCents) ? priceCents : options.offerMinCents;
  return { move: "offer", priceCents: clamp(wholeDollars(wanted), options.offerMinCents, options.offerMaxCents), closes: false };
}

// Spoken lines never carry numbers, because the UI shows the price in large type,
// and never hint at a private limit. The word lists cover every language the routes accept.
const word = (words: string) => `(?<![\\p{L}\\p{N}])(?:${words})(?![\\p{L}\\p{N}])`;
const NUMBER_WORDS = [
  "two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand",
  "dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|mil",
  "deux|trois|quatre|cinq|sept|huit|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille",
  "zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|zwölf|zwanzig|dreißig|dreissig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend",
].join("|");
// A CJK currency word counts only after a numeral: 元 and ドル also sit inside 地元 and ハンドル.
const CJK_NUMERAL = "〇零一二三四五六七八九十百千万億两";
const KO_NUMBER = "[이삼사오육칠팔구](?:십|백|천)|십만|백만|[삼사오육칠팔구]만|스물|서른|마흔|예순|일흔|여든|아흔";
const COMMON = [
  "\\p{Nd}",
  "\\p{Sc}",
  word(`dollars?|bucks?|yen|euros?|dólares?|dolares?|pesos?|yuan|rmb|${NUMBER_WORDS}`),
  `[\\p{Nd}${CJK_NUMERAL}]\\s*(?:円|元|ドル|块|塊)`,
  `[${CJK_NUMERAL}]{2,}`,
  "美元|美金|日元|人民币|日圆|달러",
  `[일이삼사오육칠팔구십백천만]원|${KO_NUMBER}`,
].join("|");
const BANNED = {
  owner: new RegExp(`${COMMON}|${word("floor|minimum|lowest|reserve|mínimo|minimo|plancher|mindestpreis|untergrenze")}|最低|下限|底价|底線|底线|최저|최소(?!한)`, "iu"),
  visitor: new RegExp(`${COMMON}|${word("max|maximum|máximo|maximo|plafond|obergrenze|höchstpreis|höchstbetrag")}|上限|最大|最高价|최대(?!한)`, "iu"),
};
const QUOTES: Record<string, string> = { '"': '"', "'": "'", "「": "」", "“": "”", "‘": "’" };

export function cleanLine(raw: string, side: "owner" | "visitor"): string | null {
  let text = raw.normalize("NFKC").trim();
  const closing = QUOTES[text[0]];
  if (closing && text.length >= 2 && text.endsWith(closing)) text = text.slice(1, -1).trim();
  if (!text || text.length > 120 || BANNED[side].test(text)) return null;
  return text;
}
