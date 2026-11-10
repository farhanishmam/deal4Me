import type { FoodOrder, Item, ItemRequest, Negotiation, Rental, Shop, StepEvent, VisitorProfile } from "./types";

export interface Timers {
  onboarding?: { startedAt: number; stoppedAt?: number };
  deal?: { startedAt: number; stoppedAt?: number };
}

export interface DataState {
  shops: Shop[];
  items: Item[];
  orders: FoodOrder[];
  rentals: Rental[];
  itemRequests: ItemRequest[];
}

export interface AppState extends DataState {
  negotiations: Negotiation[];
  stepLog: StepEvent[];
  visitor: VisitorProfile;
  timers: Timers;
}

export function emptyState(): AppState {
  return {
    shops: [], items: [], orders: [], rentals: [], itemRequests: [], negotiations: [], stepLog: [], timers: {},
    visitor: {
      firstName: "", language: "en", tripStart: "", tripEnd: "",
      interests: [], budgetCents: 25000,
    },
  };
}
