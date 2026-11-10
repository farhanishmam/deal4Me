import { ReturnCheckView } from "@/components/deals/money/ReturnCheckView";

export default async function Page({ params }: PageProps<"/sell/rentals/[id]">) {
  const { id } = await params;
  return <ReturnCheckView id={id} />;
}
