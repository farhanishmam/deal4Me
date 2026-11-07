import type { Lang } from "@/lib/types";

export interface Dict {
  search: string;
  home: string;
  all: string;
  categories: string;
  askAgent: string;
  featured: string;
  meet: string;
  welcome: string;
  orderTotal: string;
  viewOrder: string;
  add: string;
  added: string;
  rent: string;
  buy: string;
  day: string;
  deposit: string;
  available: string;
  unavailable: string;
  results: string;
  none: string;
  clear: string;
  count: string;
  countOne: string;
  more: string;
  away: string;
  agentReady: string;
  permit: string;
  binding: string;
}

const en: Dict = {
  search: "Search items",
  home: "Home",
  all: "All items",
  categories: "Categories",
  askAgent: "Ask the agent",
  featured: "Featured",
  meet: "Meet {owner}",
  welcome: "Welcome to {name}",
  orderTotal: "Order total",
  viewOrder: "View order",
  add: "Add to order",
  added: "Added",
  rent: "Rent",
  buy: "Buy",
  day: "/day",
  deposit: "{amount} deposit, held, not charged",
  available: "Available",
  unavailable: "Unavailable",
  results: "Results",
  none: "Nothing matches",
  clear: "Clear search",
  count: "{n} items",
  countOne: "1 item",
  more: "More",
  away: "{km} km away",
  agentReady: "Agent-ready",
  permit: "Permit verified",
  binding: "Binding checks at {partner}",
};

const ja: Dict = {
  search: "アイテムを検索",
  home: "ホーム",
  all: "すべて",
  categories: "カテゴリ",
  askAgent: "エージェントに相談",
  featured: "注目",
  meet: "{owner}さんに会う",
  welcome: "{name}へようこそ",
  orderTotal: "ご注文合計",
  viewOrder: "注文を見る",
  add: "注文に追加",
  added: "追加済み",
  rent: "レンタル",
  buy: "購入",
  day: "/日",
  deposit: "デポジット{amount}（保留のみ、請求なし）",
  available: "利用可能",
  unavailable: "在庫なし",
  results: "検索結果",
  none: "該当なし",
  clear: "検索をクリア",
  count: "{n}点",
  countOne: "1点",
  more: "その他",
  away: "{km} km",
  agentReady: "エージェント対応",
  permit: "許可確認済み",
  binding: "{partner}でビンディング点検",
};

const es: Dict = {
  search: "Buscar",
  home: "Inicio",
  all: "Todo",
  categories: "Categorías",
  askAgent: "Pregunta al agente",
  featured: "Destacado",
  meet: "Conoce a {owner}",
  welcome: "Bienvenido a {name}",
  orderTotal: "Total del pedido",
  viewOrder: "Ver pedido",
  add: "Añadir al pedido",
  added: "Añadido",
  rent: "Alquilar",
  buy: "Comprar",
  day: "/día",
  deposit: "Depósito de {amount}, retenido, no cobrado",
  available: "Disponible",
  unavailable: "No disponible",
  results: "Resultados",
  none: "Sin coincidencias",
  clear: "Borrar búsqueda",
  count: "{n} artículos",
  countOne: "1 artículo",
  more: "Más",
  away: "a {km} km",
  agentReady: "Listo para el agente",
  permit: "Permiso verificado",
  binding: "Ajuste de fijaciones en {partner}",
};

const DICTS: Partial<Record<Lang, Dict>> = { en, ja, es };

/** Only a few labels are translated. Everything else falls back to English. */
export function dictFor(lang: Lang): Dict {
  return DICTS[lang] ?? en;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export const LANG_LABELS: Record<Lang, string> = {
  en: "EN",
  ja: "日本語",
  es: "Español",
  fr: "FR",
  de: "DE",
  ko: "한국어",
  zh: "中文",
};
