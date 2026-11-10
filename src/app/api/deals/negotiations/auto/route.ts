import { z } from "zod";
import type { Negotiation, NegotiationRound } from "@/lib/types";
import { ownerOpening, ownerTurn, visitorTurn, type ChatLine } from "@/server/deals/agents";
import { newDealState, ownerOptions, visitorOptions } from "@/server/deals/rules";
import { deals } from "@/server/deals/store";
import { DealInputError, dealBackground, itemForDeal } from "@/server/deals/catalog";
import { aiErrorMessage } from "@/server/ai/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROUNDS = 6;

const Body = z.object({
  itemId: z.string().trim().min(1).max(100),
  visitorMaxCents: z.number().int().min(100).max(100_000_000),
  days: z.number().int().min(1).max(60).optional(),
  lang: z.enum(["en", "ja", "es", "fr", "de", "ko", "zh"]).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 });
  const { itemId, visitorMaxCents, lang = "en" } = parsed.data;
  let item;
  try {
    item = itemForDeal(itemId, parsed.data.days ?? 1);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load item." }, { status: error instanceof DealInputError ? error.status : 500 });
  }
  const itemName = item.name;
  const { kind, days } = item;
  const background = dealBackground(itemId, itemName, kind);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };
      try {
        const id = `neg-${crypto.randomUUID()}`;
        const now = () => new Date().toISOString();
        let state = newDealState(item.listCents, item.floorCents, MAX_ROUNDS);
        const askingCents = state.askCents;

        // The opening comes first, so the client shows the owner typing before the start line.
        const greeting = await ownerOpening({ background, askCents: askingCents, days, lang });
        if (closed) return;
        let negotiation: Negotiation = {
          id,
          itemId,
          days,
          askingCents,
          visitorMaxCents,
          rounds: [{ n: 1, by: "owner", offerCents: askingCents, message: greeting.message, at: now() }],
          maxRounds: MAX_ROUNDS,
          mode: "agent",
          status: "running",
          kind,
        };
        send({ type: "start", negotiation });

        const chat: ChatLine[] = [{ by: "owner", offerCents: askingCents, message: greeting.message }];
        const push = (round: NegotiationRound, extra: { move: string; ms: number; closes: boolean }) => {
          negotiation = { ...negotiation, rounds: [...negotiation.rounds, round] };
          chat.push({ by: round.by, offerCents: round.offerCents, message: round.message });
          send({ type: "round", round, ...extra });
        };

        let lastOffer: number | null = null;
        let status: "deal" | "no_deal" = "no_deal";
        let agreed: number | undefined;

        // The rules close the deal within MAX_ROUNDS; the bound only caps model spend if they ever fail to.
        for (let turn = 0; turn < MAX_ROUNDS && !closed; turn++) {
          const params = { askCents: state.askCents, maxCents: visitorMaxCents, round: state.round, maxRounds: state.maxRounds };
          const buyer = await visitorTurn({ params, options: visitorOptions(params), background, chat, days, lang });
          if (closed) return;
          push({ n: state.round + 1, by: "visitor", offerCents: buyer.priceCents, message: buyer.message, at: now() }, { move: buyer.move, ms: buyer.ms, closes: buyer.closes });
          if (buyer.closes) {
            if (buyer.move === "accept") {
              status = "deal";
              agreed = buyer.priceCents;
            }
            break;
          }

          const input = { kind: "offer" as const, offerCents: buyer.priceCents, previousOfferCents: lastOffer };
          lastOffer = buyer.priceCents;
          const options = ownerOptions(state, input, "agent");
          const owner = await ownerTurn({ state, input, options, background, chat, days, lang, mode: "agent" });
          if (closed) return;
          state = owner.next;
          push({ n: owner.next.round + 1, by: "owner", offerCents: owner.priceCents, message: owner.message, at: now() }, { move: owner.move, ms: owner.ms, closes: owner.closes });
          if (owner.closes) {
            if (owner.move === "accept") {
              status = "deal";
              agreed = owner.priceCents;
            }
            break;
          }
        }
        if (closed) return;

        negotiation = { ...negotiation, status, ...(agreed !== undefined ? { agreedDailyCents: agreed } : {}) };
        deals.set(id, { negotiation, state, itemName, lang });
        send({ type: "done", negotiation });
      } catch (error) {
        send({ type: "error", error: aiErrorMessage(error, "Negotiation failed. Please try again.") });
      } finally {
        if (!closed) controller.close();
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
