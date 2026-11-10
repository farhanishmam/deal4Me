export type Move = "accept" | "counter" | "hold" | "firm" | "walk";
export type BuyerIntent = "offer" | "accept" | "other";

export interface DealState {
  listCents: number;
  floorCents: number;
  askCents: number;
  round: number;
  maxRounds: number;
  firm: boolean;
  lowballs: number;
}

// closes = negotiation ended. accept means deal; walk means no deal.
export interface Decision {
  move: Move;
  priceCents: number;
  next: DealState;
  closes: boolean;
}

const D = 100;
const whole = (cents: number) => Math.round(cents / D) * D;

export function newDealState(listCents: number, floorCents: number, maxRounds = 6): DealState {
  return { listCents, floorCents, askCents: listCents, round: 0, maxRounds, firm: false, lowballs: 0 };
}

function softFloor(s: DealState): number {
  const raw = s.floorCents + 0.03 * (s.listCents - s.floorCents);
  return Math.min(Math.ceil(raw / D - 1e-9) * D, s.listCents);
}

export function decide(state: DealState, intent: BuyerIntent, offerCents: number | null): Decision {
  const out = (move: Move, priceCents: number, next: DealState, closes = false): Decision => ({
    move,
    priceCents,
    next,
    closes,
  });

  if (intent === "accept") return out("accept", state.askCents, state, true);
  if (intent !== "offer" || offerCents === null) {
    return state.firm
      ? out("firm", state.listCents, state)
      : out("hold", state.askCents, state);
  }

  const list = state.listCents;
  const soft = softFloor(state);
  const offer = whole(offerCents);
  const r = offer / list;
  const s: DealState = { ...state, round: state.round + 1 };
  const last = s.round >= s.maxRounds;

  // No deal this turn: at the round limit, take a fair offer or walk.
  const noDeal = (move: Move, price: number, next: DealState): Decision => {
    if (!last) return out(move, price, next);
    return offer >= soft ? out("accept", offer, next, true) : out("walk", price, next, true);
  };

  if (r < 0.4 || offer < 0.6 * state.floorCents) {
    s.firm = true;
    s.lowballs = state.lowballs + 1;
    s.askCents = list;
    if (s.lowballs >= 3) return out("walk", list, s, true);
    if (last) return out("walk", list, s, true);
    return out("firm", list, s);
  }

  if (state.firm) {
    if (r < 0.75) return noDeal("firm", list, s);
    s.firm = false;
    s.askCents = list;
  }

  const ask = s.askCents;
  if (offer >= ask) return out("accept", ask, s, true);
  if (r >= 0.9 && offer >= soft) return out("accept", offer, s, true);
  if (ask - offer <= D && offer >= soft) return out("accept", offer, s, true);
  if (r < 0.55) return noDeal("hold", ask, s);
  if (ask <= soft) return noDeal("hold", ask, s);

  let target = whole(ask - 0.4 * (ask - offer));
  target = Math.max(Math.min(target, ask - D), soft);
  return noDeal("counter", target, { ...s, askCents: target });
}
