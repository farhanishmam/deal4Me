import type { Shop } from "./types";

type Hooks = {
  ingest: (shop: Shop) => void;
  onError: (message: string, retry: () => void) => void;
  onSaved: () => void;
};

type PendingShop = { desired: Shop; version: number; worker?: Promise<void>; error?: Error };
const pending = new Map<string, PendingShop>();
const mutations = new Map<string, Promise<unknown>>();
let hooks: Hooks | undefined;

export function configureShopSync(next: Hooks): void {
  hooks = next;
}

/** Local optimistic records must survive refresh while a save is active or failed. */
export function getPendingShopIds(): ReadonlySet<string> {
  return new Set([...pending.keys(), ...mutations.keys()]);
}

/** Serializes manual edits, AI changes and publication for each shop. */
export async function runShopMutation<T>(shopId: string, operation: () => Promise<T>): Promise<T> {
  const previous = mutations.get(shopId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  mutations.set(shopId, next);
  try {
    return await next;
  } finally {
    if (mutations.get(shopId) === next) mutations.delete(shopId);
  }
}

/** Applies a server response without treating it as a new user edit. */
export function ingestServerShop(shop: Shop): void {
  const queued = pending.get(shop.id);
  if (queued) {
    // A response for an earlier edit must not erase a later optimistic edit.
    queued.desired = {
      ...queued.desired,
      liveAt: shop.liveAt,
      onboardingSeconds: shop.onboardingSeconds,
    };
    hooks?.ingest(queued.desired);
  } else {
    hooks?.ingest(shop);
  }
}

async function postShop(shop: Shop): Promise<Shop> {
  const response = await fetch("/api/data/shops", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shop }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `Could not save this shop (${response.status})`);
  return body as Shop;
}

function drain(shopId: string, entry: PendingShop): Promise<void> {
  if (entry.worker) return entry.worker;
  entry.error = undefined;
  entry.worker = (async () => {
    while (pending.get(shopId) === entry) {
      const snapshot = entry.desired;
      const version = entry.version;
      let saved: Shop;
      try {
        saved = await runShopMutation(shopId, () => postShop(snapshot));
      } catch (error) {
        const failure = error instanceof Error ? error : new Error("Could not save your shop changes");
        entry.error = failure;
        hooks?.onError(failure.message, () => { void retryPendingShopSaves(); });
        return;
      }
      if (entry.version === version) {
        pending.delete(shopId);
        ingestServerShop(saved);
        hooks?.onSaved();
        return;
      }
    }
  })().finally(() => { entry.worker = undefined; });
  return entry.worker;
}

/** Keeps only the latest unsent snapshot; an older response cannot replace it. */
export function queueShopSave(shop: Shop): void {
  const existing = pending.get(shop.id);
  if (existing) {
    existing.desired = shop;
    existing.version += 1;
    void drain(shop.id, existing);
  } else {
    const entry: PendingShop = { desired: shop, version: 1 };
    pending.set(shop.id, entry);
    void drain(shop.id, entry);
  }
}

export async function retryPendingShopSaves(): Promise<void> {
  await Promise.all([...pending].map(([shopId, entry]) => drain(shopId, entry)));
}

/** Publication must wait for the latest local name, theme and sections. */
export async function flushPendingShopSave(shopId: string): Promise<void> {
  const entry = pending.get(shopId);
  if (!entry) return;
  await drain(shopId, entry);
  if (pending.has(shopId)) throw entry.error ?? new Error("Your shop changes have not been saved. Try again.");
}
