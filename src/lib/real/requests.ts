import type { Api } from "@/lib/api-contract";
import type { ItemRequest, ItemRequestInput } from "@/lib/types";
import { useStore } from "@/lib/store";
import { logStep, postJson } from "./http";

export async function requestItem(input: ItemRequestInput): Promise<ItemRequest> {
  const request = await postJson<ItemRequest>("/api/data/requests", input);
  useStore.getState().upsertItemRequest(request);
  logStep("Visitor agent", "Sent item request", `${request.itemId}${request.size ? ` · ${request.size}` : ""}`);
  return request;
}

export const realRequests = { requestItem } satisfies Pick<Api, "requestItem">;
