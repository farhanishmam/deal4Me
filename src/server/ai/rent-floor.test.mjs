import assert from "node:assert/strict";
import test from "node:test";
import { MIN_RENT_SHARE, minDailyRentCents, withRentFloor } from "./rent-floor.ts";

const estimates = (saleCents, rentCents, rangeCents = [rentCents, rentCents], depositCents = 4000) => ({
  rental: { amountCents: rentCents, rangeCents, depositCents, reasoning: "Rent reasoning." },
  sale: { amountCents: saleCents, rangeCents: [saleCents, saleCents], reasoning: "Sale reasoning." },
});

test("the floor is a tenth of the item's value", () => {
  assert.equal(MIN_RENT_SHARE, 0.1);
});

test("a $90 item rents for at least $9", () => {
  assert.equal(minDailyRentCents(9000), 900);
});

test("rounds up to whole dollars, so $94 needs $10", () => {
  assert.equal(minDailyRentCents(9400), 1000);
  assert.equal(minDailyRentCents(9001), 1000);
});

test("exact tenths are not pushed up by float error", () => {
  for (const dollars of [7, 14, 21, 29, 70, 290, 1000]) {
    assert.equal(minDailyRentCents(dollars * 100), Math.ceil(dollars / 10) * 100, `$${dollars}`);
  }
  assert.equal(minDailyRentCents(100000), 10000);
});

test("a very cheap item still rents for at least $1", () => {
  assert.equal(minDailyRentCents(300), 100);
  assert.equal(minDailyRentCents(1), 100);
  assert.equal(minDailyRentCents(0), 100);
});

test("raises a $2 a day smartwatch worth $90 to $9", () => {
  const out = withRentFloor(estimates(9000, 200, [150, 300]));
  assert.equal(out.rental.amountCents, 900);
  assert.deepEqual(out.rental.rangeCents, [900, 900]);
  assert.equal(out.rental.depositCents, 4000);
  assert.equal(out.rental.reasoning, "Rent reasoning.");
  assert.equal(out.sale.amountCents, 9000);
});

test("a $1000 phone rents for at least $100", () => {
  assert.equal(withRentFloor(estimates(100000, 2000, [1000, 4000])).rental.amountCents, 10000);
});

test("leaves compliant estimates unchanged", () => {
  const ok = estimates(9000, 1200, [900, 1800]);
  assert.equal(withRentFloor(ok), ok);
  assert.deepEqual(ok, estimates(9000, 1200, [900, 1800]));
});

test("raises a low range bound that is under the floor while the rent complies", () => {
  const out = withRentFloor(estimates(9000, 1000, [400, 1500]));
  assert.equal(out.rental.amountCents, 1000);
  assert.deepEqual(out.rental.rangeCents, [900, 1500]);
});

test("keeps the range ordered around the rent", () => {
  const out = withRentFloor(estimates(60000, 500, [300, 800]));
  const [low, high] = out.rental.rangeCents;
  assert.equal(out.rental.amountCents, 6000);
  assert.ok(low <= out.rental.amountCents && out.rental.amountCents <= high);
  assert.deepEqual(out.rental.rangeCents, [6000, 6000]);
});

test("does not change the input", () => {
  const input = estimates(9000, 200, [150, 300]);
  withRentFloor(input);
  assert.deepEqual(input, estimates(9000, 200, [150, 300]));
});
