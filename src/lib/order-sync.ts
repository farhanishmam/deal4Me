import type { FoodOrder } from "./types";

type Hooks = {
  ingest: (order: FoodOrder) => void;
  onError: (message: string, retry?: () => void) => void;
  onSaved: () => void;
};
type PendingOrder = { desired: FoodOrder; statuses: FoodOrder["status"][]; worker?: Promise<void> };
const pending = new Map<string, PendingOrder>();
const mutations = new Map<string, Promise<unknown>>();
let hooks: Hooks | undefined;
class StatusConflict extends Error {}

export function configureOrderSync(next: Hooks): void { hooks = next; }

export function getPendingOrderIds(): ReadonlySet<string> {
  return new Set([...pending.keys(), ...mutations.keys()]);
}

export async function runOrderMutation<T>(orderId: string, operation: () => Promise<T>): Promise<T> {
  const previous = mutations.get(orderId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  mutations.set(orderId, next);
  try { return await next; }
  finally { if (mutations.get(orderId) === next) mutations.delete(orderId); }
}

export function ingestServerOrder(order: FoodOrder): void {
  const queued = pending.get(order.id);
  if (queued) {
    queued.desired = { ...order, status: queued.desired.status };
    hooks?.ingest(queued.desired);
  } else hooks?.ingest(order);
}

async function postStatus(orderId: string, status: FoodOrder["status"]): Promise<FoodOrder> {
  const response = await fetch(`/api/data/orders/${encodeURIComponent(orderId)}/status`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error ?? `Could not update this order (${response.status})`;
    throw response.status === 409 ? new StatusConflict(message) : new Error(message);
  }
  return body as FoodOrder;
}

async function reconcileConflict(orderId: string): Promise<void> {
  const response = await fetch("/api/data/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not refresh the changed order. Try again.");
  const data = await response.json() as { orders: FoodOrder[] };
  const current = data.orders.find((order) => order.id === orderId);
  if (!current) throw new Error("This order is no longer available.");
  pending.delete(orderId);
  ingestServerOrder(current);
}

function drain(orderId: string, entry: PendingOrder): Promise<void> {
  if (entry.worker) return entry.worker;
  entry.worker = (async () => {
    while (pending.get(orderId) === entry && entry.statuses.length) {
      let saved: FoodOrder;
      try {
        saved = await runOrderMutation(orderId, () => postStatus(orderId, entry.statuses[0]));
      } catch (error) {
        if (error instanceof StatusConflict) {
          try {
            await reconcileConflict(orderId);
            hooks?.onError(error.message);
            return;
          } catch {
            // Keep the pending transition if the canonical state is unavailable.
          }
        }
        hooks?.onError(error instanceof Error ? error.message : "Could not save this order status", () => { void retryPendingOrderSaves(); });
        return;
      }
      entry.statuses.shift();
      if (entry.statuses.length === 0) {
        pending.delete(orderId);
        ingestServerOrder(saved);
        hooks?.onSaved();
      }
    }
  })().finally(() => { entry.worker = undefined; });
  return entry.worker;
}

/** Keep every status transition: the server forbids skipping workflow steps. */
export function queueOrderStatus(order: FoodOrder): void {
  const existing = pending.get(order.id);
  if (existing) {
    existing.desired = order;
    if (existing.statuses[existing.statuses.length - 1] !== order.status) existing.statuses.push(order.status);
    void drain(order.id, existing);
  } else {
    const entry: PendingOrder = { desired: order, statuses: [order.status] };
    pending.set(order.id, entry);
    void drain(order.id, entry);
  }
}

export async function retryPendingOrderSaves(): Promise<void> {
  await Promise.all([...pending].map(([orderId, entry]) => drain(orderId, entry)));
}
