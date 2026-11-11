import type { Api } from "@/lib/api-contract";
import { logStep, postJson, postNdjson } from "@/lib/real/http";
import { useStore } from "@/lib/store";
import type { Lang, Negotiation, NegotiationRound } from "@/lib/types";

const VISITOR_LINES: Partial<Record<Lang, string>> = {
  en: "Could you do a little better on the price?",
  ja: "もう少しお安くなりませんか。",
  es: "Podrías mejorar un poco el precio?",
  fr: "Pourriez-vous faire un petit geste sur le prix ?",
  de: "Könnten Sie mir beim Preis etwas entgegenkommen?",
  ko: "가격을 조금만 더 맞춰 주실 수 있나요?",
  zh: "价格可以再优惠一点吗？",
};

const price = (cents: number, sale: boolean) => `$${Math.round(cents / 100)}${sale ? "" : " per day"}`;

/** Log wording for one agent move; a missing move falls back to the side's usual verb. */
function describeMove(by: "owner" | "visitor", move: string | undefined, amount: string): string {
  switch (move) {
    case "accept":
      return `Accepted ${amount}`;
    case "counter":
      return `Countered ${amount}`;
    case "hold":
      return `Held at ${amount}`;
    case "walk":
      return "Walked away";
    case "offer":
      return `Offered ${amount}`;
    default:
      return by === "owner" ? `Countered ${amount}` : `Offered ${amount}`;
  }
}

type AutoLine =
  | { type: "start" | "done"; negotiation: Negotiation }
  | { type: "round"; round: NegotiationRound; move?: string; ms?: number; closes?: boolean }
  | { type: "error"; error: string };

async function haggle(
  input: Parameters<Api["startNegotiation"]>[0],
  cb: Parameters<Api["startNegotiation"]>[1],
  itemId: string,
  itemName: string,
  sale: boolean,
): Promise<Negotiation> {
  const lang = useStore.getState().visitor.language;
  logStep("Deals agent", "Started a negotiation", sale ? `${itemName}, purchase, agent mode` : `${itemName}, ${input.days} days, agent mode`);
  const started = Date.now();
  let current: Negotiation | null = null;
  let final: Negotiation | null = null;
  const fix = (n: Negotiation): Negotiation => ({
    ...n,
    itemId,
    days: sale ? 1 : input.days,
    visitorMaxCents: input.visitorMaxCents,
    mode: "agent",
    ...(sale ? { kind: "sale" as const } : {}),
  });

  await postNdjson<AutoLine>(
    "/api/deals/negotiations/auto",
    {
      itemId,
      visitorMaxCents: input.visitorMaxCents,
      days: input.days,
      lang,
    },
    (line) => {
      // The screen was left or restarted: the stream is being cancelled, so write nothing more.
      if (cb?.signal?.aborted) return;
      if (line.type === "error") throw new Error(line.error);
      if (line.type === "start") {
        current = fix(line.negotiation);
        useStore.getState().upsertNegotiation(current);
        const first = current.rounds[0];
        if (first) {
          cb?.onRound?.(first);
          logStep("Owner agent", `Opened at ${price(first.offerCents, sale)}`, itemName);
        }
      } else if (line.type === "round" && current) {
        const round = line.round;
        current = { ...current, rounds: [...current.rounds, round] };
        useStore.getState().upsertNegotiation(current);
        // The closing round arrives in the same breath as `done`. The screen shows it with the deal,
        // so it is not announced on its own; that would flash the next speaker typing after the close.
        if (!line.closes) cb?.onRound?.(round);
        const actor = round.by === "owner" ? "Owner agent" : "Visitor agent";
        logStep(actor, describeMove(round.by, line.move, price(round.offerCents, sale)), itemName, line.ms);
      } else if (line.type === "done") {
        final = fix(line.negotiation);
      }
    },
    { signal: cb?.signal },
  );

  if (!final) throw new Error("Negotiation ended early");
  const result: Negotiation = final;
  useStore.getState().upsertNegotiation(result);
  const ms = Date.now() - started;
  if (result.status === "deal" && result.agreedDailyCents !== undefined) {
    logStep("Deals agent", "Deal reached", `${price(result.agreedDailyCents, sale)} on ${itemName.toLowerCase()}`, ms);
  } else {
    logStep("Deals agent", "No deal", itemName, ms);
  }
  return result;
}

async function start(
  input: Parameters<Api["startNegotiation"]>[0],
  cb?: Parameters<Api["startNegotiation"]>[1],
): Promise<Negotiation> {
  const store = useStore.getState();
  const item = store.items.find((i) => i.id === input.itemId);
  if (!item) throw new Error("Item not found");
  const sale = item.kind === "sale";
  if (!sale && !item.rental) throw new Error("Rental terms not found");
  if (input.mode === "agent") return haggle(input, cb, item.id, item.name, sale);

  const { negotiation } = await postJson<{ negotiation: Negotiation }>("/api/deals/negotiations", {
    itemId: item.id,
    days: input.days,
    visitorMaxCents: input.visitorMaxCents,
    lang: store.visitor.language,
  });
  const next: Negotiation = {
    ...negotiation,
    itemId: item.id,
    days: sale ? 1 : input.days,
    visitorMaxCents: input.visitorMaxCents,
    mode: "manual",
    ...(sale ? { kind: "sale" as const } : {}),
  };
  useStore.getState().upsertNegotiation(next);
  const round = next.rounds[0];
  if (round) cb?.onRound?.(round);
  logStep("Deals agent", "Started a negotiation", sale ? `${item.name}, purchase, manual mode` : `${item.name}, ${input.days} days, manual mode`);
  if (round) logStep("Owner agent", `Opened at ${price(round.offerCents, sale)}`, item.name);
  return next;
}

async function offer(negotiationId: string, offerCents: number, message: string): Promise<Negotiation> {
  const store = useStore.getState();
  const lang = store.visitor.language;
  const res = await postJson<{ negotiation: Negotiation; move?: string; timing?: { totalMs: number } }>(
    `/api/deals/negotiations/${encodeURIComponent(negotiationId)}/messages`,
    { offerCents, message: message.trim() || undefined, lang },
  );
  const prev = store.negotiations.find((n) => n.id === negotiationId);
  const rounds = res.negotiation.rounds.map((r) => {
    if (r.by !== "visitor" || r.message.trim()) return r;
    return { ...r, message: VISITOR_LINES[lang] ?? VISITOR_LINES.en! };
  });
  const next: Negotiation = {
    ...res.negotiation,
    rounds,
    itemId: res.negotiation.itemId === "custom" && prev ? prev.itemId : res.negotiation.itemId,
    days: prev?.days ?? res.negotiation.days,
    visitorMaxCents: prev?.visitorMaxCents ?? res.negotiation.visitorMaxCents,
    kind: res.negotiation.kind ?? prev?.kind,
  };
  const sale = next.kind === "sale";
  useStore.getState().upsertNegotiation(next);

  const ms = res.timing?.totalMs;
  const last = rounds[rounds.length - 1];
  logStep("Visitor agent", `Offered ${price(offerCents, sale)}`);
  if (next.status === "deal") logStep("Deals agent", "Deal reached", price(next.agreedDailyCents ?? offerCents, sale), ms);
  else if (next.status === "no_deal") logStep("Deals agent", "No deal", undefined, ms);
  else if (last) logStep("Owner agent", describeMove("owner", res.move, price(last.offerCents, sale)), undefined, ms);
  return next;
}

export const realNegotiate = {
  startNegotiation: start,
  submitManualOffer: offer,
} satisfies Pick<Api, "startNegotiation" | "submitManualOffer">;
