import { mockApi, type MockApi } from "./mock-api";
import { realApi } from "./real";

// Set NEXT_PUBLIC_USE_MOCK=0 to let real calls replace the mock ones.
export const api: MockApi =
  process.env.NEXT_PUBLIC_USE_MOCK === "0" ? { ...mockApi, ...realApi } : mockApi;
