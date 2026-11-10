import type { Api } from "./api-contract";
import { realApi } from "./real";

// Integration owns this entry point: all product calls use the real backend.
export const api: Api = realApi;
