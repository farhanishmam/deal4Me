import type { Api } from "@/lib/api-contract";
import { logStep, postJson } from "@/lib/real/http";
import type { AgentCard, VisitorProfile } from "@/lib/types";

interface SearchResponse {
  cards: AgentCard[];
  summary: string;
  ms: number;
}

const TEXT = {
  en: {
    none: "Tell me a bit more about what you need, such as the item, the dates or a budget.",
    steps: ["Read your request", "Searched listings nearby", "Kept the best matches"],
    stepsNone: ["Read your request", "Checked published listings"],
  },
  ja: {
    none: "お探しのものをもう少し詳しく教えてください。品物、日程、ご予算などがあると助かります。",
    steps: ["ご依頼を確認", "近くの出品を検索", "条件に合う候補を選択"],
    stepsNone: ["ご依頼を確認", "公開中の商品を確認"],
  },
} as const;

async function askVisitorAgent(
  message: string,
  profile: VisitorProfile,
): Promise<{ reply: string; cards: AgentCard[]; steps: string[] }> {
  const t = TEXT[profile.language === "ja" ? "ja" : "en"];
  // Saved trip dates never expire, so send them only as a future start with an optional later end.
  const start = profile.tripStart ? Date.parse(profile.tripStart) : NaN;
  const end = profile.tripEnd ? Date.parse(profile.tripEnd) : NaN;
  const sendStart = start > Date.now();
  const sendEnd = sendStart && end > start;
  // The profile size is free text; only a single size can match a listed size.
  const size = profile.preferredSize?.trim();
  let res: SearchResponse;
  try {
    res = await postJson<SearchResponse>("/api/ai/search", {
      query: message,
      lang: profile.language,
      budgetCents: profile.budgetCents,
      ...(sendStart ? { startsAt: new Date(start).toISOString() } : {}),
      ...(sendEnd ? { endsAt: new Date(end).toISOString() } : {}),
      ...(size && !size.includes(",") && size.length <= 80 ? { size } : {}),
    }, { signal: AbortSignal.timeout(35_000) });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(profile.language === "ja" ? "検索に時間がかかっています。もう一度お試しください。" : "That search took too long. Please try again.");
    }
    throw error;
  }
  const cards = res.cards;
  logStep(
    "Visitor agent",
    cards.length > 0 ? "Searched listings" : "No matching listings",
    `${cards.length} matches for "${message.slice(0, 40)}"`,
    res.ms,
  );
  return {
    reply: res.summary.trim() || t.none,
    cards,
    steps: [...(cards.length > 0 ? t.steps : t.stepsNone)].slice(0, 4),
  };
}

export const realVisitor = {
  askVisitorAgent,
} satisfies Pick<Api, "askVisitorAgent">;
