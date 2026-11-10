import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DataStateSchema, type StoredDataState } from "./schema";

export const DATA_DIR = process.env.RIDGE_DATA_DIR ?? join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "catalog.json");

export function readDataState(): StoredDataState {
  try {
    return DataStateSchema.parse(JSON.parse(readFileSync(DATA_FILE, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { shops: [], items: [], orders: [], rentals: [], itemRequests: [] };
    throw error;
  }
}

/** Synchronous read/update/atomic rename keeps writes serialized in the local Node server. */
export function updateDataState<T>(update: (state: StoredDataState) => T): T {
  const state = readDataState();
  const result = update(state);
  const checked = DataStateSchema.parse(state);
  mkdirSync(DATA_DIR, { recursive: true });
  const temp = join(DATA_DIR, `catalog-${process.pid}.tmp`);
  writeFileSync(temp, JSON.stringify(checked), { mode: 0o600 });
  renameSync(temp, DATA_FILE);
  return result;
}

export class DataError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function dataError(error: unknown): Response {
  if (error instanceof DataError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Could not persist workspace data", error);
  return Response.json({ error: "Could not load or save workspace data. Check the server log." }, { status: 500 });
}
