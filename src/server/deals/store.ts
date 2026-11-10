import type { Lang, Negotiation } from "@/lib/types";
import type { DealState } from "@/server/deals/rules";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { DATA_DIR } from "@/server/data/store";

export interface DealRecord {
  negotiation: Negotiation;
  state: DealState;
  itemName: string;
  lang: Lang;
}

const cents = z.number().int().nonnegative();
const RecordSchema = z.object({
  negotiation: z.object({
    id: z.string().min(1), itemId: z.string().min(1), days: z.number().int().positive(),
    askingCents: cents, visitorMaxCents: cents,
    rounds: z.array(z.object({ n: z.number().int().positive(), by: z.enum(["visitor", "owner"]), offerCents: cents, message: z.string(), at: z.string() })),
    maxRounds: z.number().int().positive(), mode: z.enum(["agent", "manual"]),
    status: z.enum(["running", "deal", "no_deal"]), agreedDailyCents: cents.optional(),
    kind: z.enum(["rental", "sale"]).optional(),
  }),
  state: z.object({ listCents: cents, floorCents: cents, askCents: cents, round: z.number().int().nonnegative(), maxRounds: z.number().int().positive() }),
  itemName: z.string(), lang: z.enum(["en", "ja", "es", "fr", "de", "ko", "zh"]),
});

function readRecords(): DealRecord[] {
  const file = join(DATA_DIR, "negotiations.json");
  if (!existsSync(file)) return [];
  return z.array(RecordSchema).parse(JSON.parse(readFileSync(file, "utf8")));
}

export const deals = {
  get(id: string): DealRecord | undefined {
    return readRecords().find((record) => record.negotiation.id === id);
  },
  set(id: string, record: DealRecord): void {
    const checked = RecordSchema.parse(record);
    const records = readRecords().filter((entry) => entry.negotiation.id !== id);
    records.unshift(checked);
    mkdirSync(DATA_DIR, { recursive: true });
    const file = join(DATA_DIR, "negotiations.json");
    const temp = `${file}.${crypto.randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify(records), { mode: 0o600 });
    renameSync(temp, file);
  },
};

/**
 * The public negotiation for every screen. The state and its private floor never leave the server,
 * and the buyer's private maximum is blanked (0): it stays on the buyer's own device.
 */
export function listNegotiations(): Negotiation[] {
  return readRecords().map((record) => ({ ...record.negotiation, visitorMaxCents: 0 }));
}
