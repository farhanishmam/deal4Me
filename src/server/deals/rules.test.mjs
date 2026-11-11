import assert from "node:assert/strict";
import test from "node:test";
import { applyOwner, applyVisitor, cleanLine, floorDollar, newDealState, ownerOptions, visitorOptions } from "./rules.ts";

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, items) => items[Math.floor(rng() * items.length)];
const wildPrice = (rng, ask) =>
  pick(rng, [-1e9, -500, 0, 1, 99, 150, 12345, ask - 100, ask, ask + 100, ask * 3, rng() * 1e6, 1e12, Number.NaN, Infinity, -Infinity, rng() * ask]);

// Mirrors the auto route: buyer turn, then owner turn, until something closes.
// The buyer always offers exactly the picked price (floorDollar(max)); only the model's action and price are adversarial.
function simulate({ list, floor, max, maxRounds, rng }) {
  let state = newDealState(list, floor, maxRounds);
  const normFloor = state.floorCents;
  const picked = floorDollar(max);
  let last = null;
  let status = null;
  let agreed;
  let visitorOffers = 0;
  let ownerMessages = 1;
  let prevAsk = state.askCents;

  for (let i = 0; i < 40 && !status; i++) {
    const vOpts = visitorOptions({ askCents: state.askCents, maxCents: max, round: state.round, maxRounds });
    assert.ok(vOpts.allowed.length > 0);
    const v = applyVisitor(vOpts, pick(rng, vOpts.allowed), wildPrice(rng, state.askCents));
    assert.ok(v, "an allowed visitor action must apply");
    assert.equal(applyVisitor(vOpts, "bogus", 0), null);
    assert.equal(applyVisitor(vOpts, "walk", 0), null, "the buyer cannot walk");
    assert.ok(v.priceCents <= max, `visitor price ${v.priceCents} above max ${max}`);
    assert.ok(v.priceCents % 100 === 0, `visitor price ${v.priceCents} not whole dollars`);
    if (v.move === "accept") {
      status = "deal";
      agreed = v.priceCents;
      assert.equal(v.priceCents, state.askCents);
      assert.ok(state.askCents <= picked, "buyer accepted an ask above the picked price");
      break;
    }
    assert.equal(v.priceCents, picked, `buyer offered ${v.priceCents}, picked ${picked}`);
    assert.ok(v.priceCents < state.askCents, "buyer offer reached the ask without accepting");
    visitorOffers++;

    const oOpts = ownerOptions(state, { kind: "offer", offerCents: v.priceCents, previousOfferCents: last });
    last = v.priceCents;
    assert.ok(oOpts.allowed.length > 0);
    const o = applyOwner(state, oOpts, pick(rng, oOpts.allowed), wildPrice(rng, state.askCents));
    assert.ok(o, "an allowed owner action must apply");
    assert.equal(applyOwner(state, oOpts, "bogus", 0), null);
    assert.ok(o.priceCents >= normFloor, `owner price ${o.priceCents} below floor ${normFloor}`);
    assert.ok(o.next.askCents <= prevAsk, "owner ask rose");
    assert.equal(o.next.round, state.round + 1);
    assert.equal(o.next.floorCents, state.floorCents);
    prevAsk = o.next.askCents;
    ownerMessages++;
    state = o.next;
    if (o.closes) {
      status = o.move === "accept" ? "deal" : "no_deal";
      if (status === "deal") agreed = o.priceCents;
    }
  }

  assert.ok(status, `did not close: list ${list} floor ${floor} max ${max}`);
  assert.ok(visitorOffers <= maxRounds - 1, `${visitorOffers} buyer offers in ${maxRounds} rounds`);
  assert.ok(ownerMessages <= maxRounds, `${ownerMessages} owner messages in ${maxRounds} rounds`);
  if (max >= 100) assert.equal(status === "deal", picked >= normFloor, `deal iff: list ${list} floor ${floor} max ${max} got ${status}`);
  if (status === "deal") {
    assert.ok(agreed >= normFloor && agreed <= max, `agreed ${agreed} outside [${normFloor}, ${max}]`);
    assert.equal(agreed, Math.min(picked, state.listCents), "the agreed price is the picked price, capped at the list");
  }
  return { status, agreed };
}

test("adversarial agents never break the invariants", () => {
  const lists = [50, 100, 129, 200, 300, 1299, 1999, 2399, 5000, 12000, 40000];
  const floors = [0, 100, 150, 2500, 4000, 6000, 9999, 40000, 1_000_000];
  const maxes = [100, 150, 500, 2000, 4999, 5000, 9000, 45000, 200000];
  const rounds = [2, 3, 4, 6, 8];
  let runs = 0;
  let deals = 0;
  for (const list of lists) {
    for (const floor of floors) {
      for (const max of maxes) {
        for (const maxRounds of rounds) {
          for (let seed = 1; seed <= 6; seed++) {
            const rng = mulberry32(list * 31 + floor * 17 + max * 13 + maxRounds * 7 + seed);
            const result = simulate({ list, floor, max, maxRounds, rng });
            runs++;
            if (result.status === "deal") deals++;
          }
        }
      }
    }
  }
  assert.ok(runs > 20000);
  assert.ok(deals > 0 && deals < runs);
});

test("edge cases: free floor, floor above list, one dollar ask, max below floor, max above list", () => {
  const cases = [
    { list: 5000, floor: 0, max: 20000, expect: "deal" },
    { list: 5000, floor: 9000, max: 5000, expect: "deal" },
    { list: 5000, floor: 9000, max: 4900, expect: "no_deal" },
    { list: 100, floor: 100, max: 100, expect: "deal" },
    { list: 100, floor: 0, max: 100, expect: "deal" },
    { list: 100, floor: 50, max: 99_999, expect: "deal" },
    { list: 6000, floor: 5000, max: 4000, expect: "no_deal" },
    { list: 6000, floor: 5000, max: 5000, expect: "deal" },
    { list: 6000, floor: 4500, max: 900_000, expect: "deal" },
  ];
  for (const c of cases) {
    for (let seed = 1; seed <= 200; seed++) {
      const result = simulate({ ...c, maxRounds: 6, rng: mulberry32(seed) });
      assert.equal(result.status, c.expect, JSON.stringify(c));
    }
  }
});

test("the list price is normalised to whole dollars once", () => {
  const state = newDealState(2399, 1500);
  assert.deepEqual([state.listCents, state.askCents, state.floorCents], [2400, 2400, 1500]);
  assert.equal(newDealState(1999, 500).listCents, 2000);
  assert.equal(newDealState(50, 0).listCents, 100);
  assert.equal(newDealState(129, 100).floorCents, 100);
  // A $1.29 listing is a $1 ask: a $1 buyer takes it, which a walk on the unrounded list would have missed.
  for (let seed = 1; seed <= 50; seed++) assert.equal(simulate({ list: 129, floor: 100, max: 100, maxRounds: 6, rng: mulberry32(seed) }).status, "deal");
});

test("only agent mode can walk on a repeated offer below the floor", () => {
  const state = newDealState(3500, 2200, 6);
  // An agent that repeats a price at or above the floor is not forced to close: it can still accept, counter or hold.
  const agent = ownerOptions(state, { kind: "offer", offerCents: 2200, previousOfferCents: 2200 });
  assert.deepEqual(agent.allowed, ["accept", "counter", "hold"]);
  const manual = ownerOptions(state, { kind: "offer", offerCents: 2200, previousOfferCents: 3000 }, "manual");
  assert.deepEqual(manual.allowed, ["accept", "counter", "hold"]);
  // Below the floor a manual buyer sees the same menu as for any other low offer, so nothing marks the floor.
  const below = ownerOptions(state, { kind: "offer", offerCents: 2100, previousOfferCents: 3000 }, "manual");
  assert.deepEqual(below.allowed, ["counter", "hold"]);
  assert.deepEqual(ownerOptions(state, { kind: "offer", offerCents: 2100, previousOfferCents: 2100 }, "manual").allowed, ["counter", "hold"]);
  assert.deepEqual(ownerOptions(state, { kind: "offer", offerCents: 2100, previousOfferCents: 2100 }).allowed, ["counter", "hold", "walk"]);
  // A first offer below the floor never walks: the buyer's agent has not yet repeated it.
  assert.deepEqual(ownerOptions(state, { kind: "offer", offerCents: 2100, previousOfferCents: null }).allowed, ["counter", "hold"]);
  // The last turn still decides.
  const late = { ...state, round: 4 };
  assert.deepEqual(ownerOptions(late, { kind: "offer", offerCents: 2100, previousOfferCents: 2000 }, "manual").allowed, ["walk"]);
});

test("manual buyers cannot push the owner below the floor or above the ask", () => {
  for (const [list, floor] of [[3500, 2200], [2399, 1500], [100, 0], [12000, 12000], [5000, 9000]]) {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed + list);
      let state = newDealState(list, floor, 6);
      const normFloor = state.floorCents;
      let previous = null;
      for (let turn = 0; turn < 12; turn++) {
        const offer = Math.max(1, Math.round(wildPrice(rng, state.askCents)) || 1);
        const options = ownerOptions(state, { kind: "offer", offerCents: offer, previousOfferCents: previous }, "manual");
        const outcome = applyOwner(state, options, pick(rng, options.allowed), wildPrice(rng, state.askCents));
        assert.ok(outcome);
        assert.ok(outcome.priceCents >= normFloor || outcome.move === "walk" || outcome.move === "hold", "owner price below floor");
        if (outcome.move === "accept") assert.ok(outcome.priceCents >= normFloor && outcome.priceCents <= state.askCents);
        assert.ok(outcome.next.askCents <= state.askCents && outcome.next.askCents >= normFloor);
        state = outcome.next;
        previous = offer;
        if (outcome.closes) break;
      }
    }
  }
});

test("floor is normalised to whole dollars and capped at the list price", () => {
  assert.equal(newDealState(5000, 3001).floorCents, 3100);
  assert.equal(newDealState(5000, 9000).floorCents, 5000);
  assert.equal(newDealState(5000, -20).floorCents, 0);
  assert.equal(newDealState(5000, 3000).maxRounds, 6);
});

test("owner options follow the rules in order", () => {
  const state = newDealState(10000, 6000, 6);
  assert.deepEqual(ownerOptions(state, { kind: "chat" }).allowed, ["hold"]);
  assert.equal(ownerOptions(state, { kind: "chat" }).advances, false);
  const accept = ownerOptions(state, { kind: "accept" });
  assert.deepEqual([accept.allowed, accept.acceptCents, accept.advances], [["accept"], 10000, false]);

  const above = ownerOptions(state, { kind: "offer", offerCents: 12000, previousOfferCents: null });
  assert.deepEqual([above.allowed, above.acceptCents, above.advances], [["accept"], 10000, true]);

  const low = ownerOptions(state, { kind: "offer", offerCents: 3000, previousOfferCents: null });
  assert.deepEqual(low.allowed, ["counter", "hold"]);
  assert.equal(low.counterMinCents, 6000);
  assert.equal(low.counterMaxCents, 9900);

  const fair = ownerOptions(state, { kind: "offer", offerCents: 7000, previousOfferCents: 6000 });
  assert.deepEqual(fair.allowed, ["accept", "counter", "hold"]);
  assert.equal(fair.counterMinCents, 8200);
  assert.equal(fair.acceptCents, 7000);

  const repeatedLow = ownerOptions(state, { kind: "offer", offerCents: 3000, previousOfferCents: 3000 });
  assert.deepEqual(repeatedLow.allowed, ["counter", "hold", "walk"]);
  assert.equal(repeatedLow.counterMinCents, 6000);
  const repeatedFair = ownerOptions(state, { kind: "offer", offerCents: 6500, previousOfferCents: 6500 });
  assert.deepEqual(repeatedFair.allowed, ["accept", "counter", "hold"]);
  assert.equal(repeatedFair.acceptCents, 6500);

  const late = { ...state, round: 4, askCents: 7000 };
  assert.equal(ownerOptions(late, { kind: "offer", offerCents: 6000, previousOfferCents: 5900 }).final, true);
  assert.deepEqual(ownerOptions(late, { kind: "offer", offerCents: 6000, previousOfferCents: 5900 }).allowed, ["accept"]);
  assert.deepEqual(ownerOptions(late, { kind: "offer", offerCents: 5900, previousOfferCents: 5000 }).allowed, ["walk"]);
});

test("owner counters are clamped and snapped, and an unavailable action is refused", () => {
  const state = newDealState(10000, 6000, 6);
  const options = ownerOptions(state, { kind: "offer", offerCents: 3000, previousOfferCents: null });
  assert.equal(applyOwner(state, options, "accept", 0), null);
  assert.equal(applyOwner(state, options, "walk", 0), null);
  assert.equal(applyOwner(state, options, "counter", 1_000_000).priceCents, 9900);
  assert.equal(applyOwner(state, options, "counter", -5).priceCents, 6000);
  assert.equal(applyOwner(state, options, "counter", 7249).priceCents, 7200);
  const held = applyOwner(state, options, "hold", 1);
  assert.deepEqual([held.priceCents, held.next.askCents, held.next.round, held.closes], [10000, 10000, 1, false]);
  const countered = applyOwner(state, options, "counter", 8000);
  assert.deepEqual([countered.next.askCents, countered.closes], [8000, false]);
});

test("the buyer offers exactly the picked price and cannot walk or raise it", () => {
  const base = { askCents: 10000, maxCents: 8000, round: 0, maxRounds: 6 };
  const first = visitorOptions(base);
  assert.deepEqual([first.allowed, first.offerMinCents, first.offerMaxCents, first.final], [["offer"], 8000, 8000, false]);
  // The picked price is the same on every turn, whatever the ask or the round.
  for (const [askCents, round] of [[9000, 1], [8100, 2], [8100, 4]]) {
    const o = visitorOptions({ ...base, askCents, round });
    assert.deepEqual([o.allowed, o.offerMinCents, o.offerMaxCents], [["offer"], 8000, 8000]);
  }
  assert.equal(visitorOptions({ ...base, round: 4 }).final, true);
  // Whole dollars only.
  assert.equal(visitorOptions({ ...base, maxCents: 8099 }).offerMaxCents, 8000);

  // Any model price lands on the picked price, and the model cannot walk.
  for (const wanted of [0, 1, 7000, 8000, 9900, 1e9, -5, Number.NaN, Infinity]) assert.equal(applyVisitor(first, "offer", wanted).priceCents, 8000);
  assert.equal(applyVisitor(first, "walk", 0), null);
  assert.equal(applyVisitor(first, "accept", 0), null);

  // An ask at or below the picked price is accepted at the ask, never at the picked price.
  const covered = visitorOptions({ ...base, askCents: 7500 });
  assert.deepEqual(covered.allowed, ["accept"]);
  assert.deepEqual(applyVisitor(covered, "accept", 0), { move: "accept", priceCents: 7500, closes: true });
  assert.equal(applyVisitor(covered, "offer", 8000), null);
  assert.deepEqual(visitorOptions({ ...base, askCents: 8000 }).allowed, ["accept"]);
  assert.deepEqual(visitorOptions({ ...base, askCents: 8100 }).allowed, ["offer"]);
});

test("a deal lands at exactly the picked price, or not at all", () => {
  // Floor 6000, list 10000: pick 8000 -> deal at 8000; pick 5900 -> no deal; pick 15000 -> deal at the list.
  for (const [max, expect, price] of [[8000, "deal", 8000], [6000, "deal", 6000], [5900, "no_deal"], [15000, "deal", 10000], [10000, "deal", 10000]]) {
    for (let seed = 1; seed <= 100; seed++) {
      const r = simulate({ list: 10000, floor: 6000, max, maxRounds: 6, rng: mulberry32(seed) });
      assert.equal(r.status, expect, `max ${max}`);
      if (price) assert.equal(r.agreed, price, `max ${max}`);
    }
  }
});

test("cleanLine accepts natural price-free English lines", () => {
  assert.equal(cleanLine("Those skis are barely used, and Hakuba is calling!", "owner"), "Those skis are barely used, and Hakuba is calling!");
  assert.equal(cleanLine('  "Come on, we both want you on the slopes."  ', "owner"), "Come on, we both want you on the slopes.");
  assert.equal(cleanLine("'Fair enough, I can stretch a little.'", "visitor"), "Fair enough, I can stretch a little.");
  assert.equal(cleanLine("Deal! See you at the shop.", "owner"), "Deal! See you at the shop.");
});

test("cleanLine rejects prices, number words and leaked limits", () => {
  const both = ["Let's say 50 for the skis", "How about $40?", "I could do forty", "That is a hundred too much", "Two days only, so be kind", "A few bucks off?", "Fifty dollars sounds fair", "That costs ￥500", "€ or nothing", "Ｔｈｉｓ is １２ days", "", "   ", "x".repeat(121)];
  for (const line of both) {
    assert.equal(cleanLine(line, "owner"), null, `owner: ${line}`);
    assert.equal(cleanLine(line, "visitor"), null, `visitor: ${line}`);
  }
  assert.equal(cleanLine("My floor is close", "owner"), null);
  assert.equal(cleanLine("That is my lowest, friend", "owner"), null);
  assert.equal(cleanLine("I cannot go below the minimum", "owner"), null);
  assert.equal(cleanLine("This is my reserve", "owner"), null);
  assert.equal(cleanLine("That is all my max can stretch", "visitor"), null);
  assert.equal(cleanLine("It is my maximum, sorry", "visitor"), null);
  assert.equal(cleanLine("That is my lowest offer", "visitor"), "That is my lowest offer");
  assert.equal(cleanLine("I'd stay under my max", "owner"), "I'd stay under my max");
  assert.equal(cleanLine("x".repeat(120), "owner"), "x".repeat(120));
});

test("cleanLine handles Japanese lines", () => {
  assert.equal(cleanLine("このスキー板は状態も良いですよ、一緒に楽しみましょう。", "owner"), "このスキー板は状態も良いですよ、一緒に楽しみましょう。");
  assert.equal(cleanLine("「もう少しだけ歩み寄れませんか？」", "visitor"), "もう少しだけ歩み寄れませんか?");
  assert.equal(cleanLine("五千円でどうですか", "owner"), null);
  assert.equal(cleanLine("500円でお願いします", "visitor"), null);
  assert.equal(cleanLine("5ドルならどう？", "visitor"), null);
  assert.equal(cleanLine("これが最低ラインです", "owner"), null);
  assert.equal(cleanLine("下限はお教えできません", "owner"), null);
  assert.equal(cleanLine("上限ぎりぎりです", "visitor"), null);
  assert.equal(cleanLine("最大でここまでです", "visitor"), null);
  assert.equal(cleanLine("最低でも楽しく滑りたいな", "visitor"), "最低でも楽しく滑りたいな");
});

test("cleanLine keeps ordinary Japanese and Korean words that contain a currency character", () => {
  const ok = ["地元のスキー場にぴったりです", "お元気ですか、ようこそ", "ハンドルも良好です", "ドルフィン柄が可愛いですよね"];
  for (const line of ok) {
    assert.equal(cleanLine(line, "owner"), line, `owner: ${line}`);
    assert.equal(cleanLine(line, "visitor"), line, `visitor: ${line}`);
  }
  for (const line of ["원하시는 스키가 있나요?", "직원이 바로 도와드릴게요", "저희 공원 근처 가게입니다", "천만에요, 즐거운 여행 되세요", "최대한 도와드릴게요"]) {
    assert.equal(cleanLine(line, "owner"), line, `owner: ${line}`);
    assert.equal(cleanLine(line, "visitor"), line, `visitor: ${line}`);
  }
  for (const line of ["五千円でどうですか", "千円なら", "三百元でお願い", "五块钱吧", "오십원 어때요", "만원 어때요", "오천원이면 좋겠어요", "10달러 어때요", "ドル建てで"]) {
    assert.equal(cleanLine(line, "owner"), line === "ドル建てで" ? line : null, `owner: ${line}`);
  }
  assert.equal(cleanLine("五千でどうですか", "owner"), null);
  assert.equal(cleanLine("百万でも無理です", "visitor"), null);
});

test("cleanLine blocks spelled-out prices and limits in every supported language", () => {
  const owner = ["Mi precio mínimo es cincuenta", "Mon prix plancher est cinquante", "Mein Mindestpreis ist fünfzig", "제 최저 가격은 오십이에요", "底价是五十", "Let's say ٥٠ for the skis", "Te lo dejo en veinte euros", "Je peux faire trente", "Machen wir es für vierzig", "Mil gracias, pero no"];
  for (const line of owner) assert.equal(cleanLine(line, "owner"), null, `owner: ${line}`);
  const visitor = ["Mi máximo es cincuenta", "Mon plafond est cinquante", "Meine Obergrenze ist klar", "저의 최대 예산은 오만이에요", "我的上限很清楚", "Ich zahle höchstens zwanzig"];
  for (const line of visitor) assert.equal(cleanLine(line, "visitor"), null, `visitor: ${line}`);
  for (const line of ["Esos esquís están en buen estado", "Ces skis sont en pleine forme", "Die Ski sind in gutem Zustand", "Once you try them, you will love them", "Das ist ein fairer Preis, finde ich"]) {
    assert.equal(cleanLine(line, "owner"), line, `owner: ${line}`);
    assert.equal(cleanLine(line, "visitor"), line, `visitor: ${line}`);
  }
});
