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

export async function publishShop(shopId: string, onboardingSeconds?: number): Promise<Shop> {
  await flushPendingShopSave(shopId);
  const saved = await runShopMutation(shopId, () => postJson<Shop>(`/api/data/shops/${encodeURIComponent(shopId)}/publish`, { onboardingSeconds }));
  ingestServerShop(saved);
  return saved;
}

export async function loadDataState(): Promise<DataState> {
  const response = await fetch("/api/data/state", { cache: "no-store" });
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
