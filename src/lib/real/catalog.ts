import type { DataState } from "@/lib/data-state";
import type { FoodOrder, Item, Shop } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ApiError, postJson } from "./http";
import { flushPendingShopSave, ingestServerShop, runShopMutation } from "@/lib/shop-sync";
import { ingestServerOrder, runOrderMutation } from "@/lib/order-sync";

export async function saveShop(shop: Shop, items?: Item[]): Promise<Shop> {
  await flushPendingShopSave(shop.id);
  const saved = await runShopMutation(shop.id, () => postJson<Shop>("/api/data/shops", { shop, ...(items ? { items } : {}) }));
  ingestServerShop(saved);
  return saved;
}

export async function updateItem(item: Item): Promise<Item> {
  const saved = await postJson<Item>("/api/data/items", { item });
  useStore.getState().upsertItem(saved);
  return saved;
}

/** Adds one new item; the server also lists it in its category's storefront section. */
export async function createItem(item: Item): Promise<Item> {
  await flushPendingShopSave(item.shopId);
  const saved = await runShopMutation(item.shopId, () => postJson<{ item: Item; shop: Shop }>("/api/data/items", { item, create: true }));
  useStore.getState().upsertItem(saved.item);
  ingestServerShop(saved.shop);
  return saved.item;
}

export async function publishShop(shopId: string, onboardingSeconds?: number): Promise<Shop> {
  await flushPendingShopSave(shopId);
  const saved = await runShopMutation(shopId, () => postJson<Shop>(`/api/data/shops/${encodeURIComponent(shopId)}/publish`, { onboardingSeconds }));
  ingestServerShop(saved);
  return saved;
}

/** Only seller screens load the seller view, which adds each rental's private minimum. */
export type DataView = "public" | "seller";

export function dataViewFor(pathname: string): DataView {
  return /^\/sell(er)?(\/|$)/.test(pathname) ? "seller" : "public";
}

export async function loadDataState(view: DataView = "public"): Promise<DataState> {
  const response = await fetch(view === "seller" ? "/api/data/state?view=seller" : "/api/data/state", { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? "Could not load workspace data", response.status);
  }
  return response.json();
}

export async function updateOrderStatus(orderId: string, status: FoodOrder["status"]): Promise<FoodOrder> {
  const order = await runOrderMutation(orderId, () => postJson<FoodOrder>(`/api/data/orders/${encodeURIComponent(orderId)}/status`, { status }));
  ingestServerOrder(order);
  return order;
}

export const realCatalog = { updateItem };
