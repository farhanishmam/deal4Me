import { ItemDetail } from "@/components/visitor/item/ItemDetail";

export default async function Page({ params, searchParams }: PageProps<"/visit/item/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const text = (name: string) => typeof query[name] === "string" ? query[name] as string : undefined;
  const days = Number(text("days"));
  return <ItemDetail id={id} initialDays={Number.isInteger(days) && days > 0 ? Math.min(days, 7) : 3} initialRequest={{ startsAt: text("startsAt"), endsAt: text("endsAt"), size: text("size") }} negotiationId={text("negotiation")} openRequest={text("request") === "1"} />;
}
