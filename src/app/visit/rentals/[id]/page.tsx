import { RentalStatusView } from "@/components/deals/money/RentalStatusView";

export default async function Page({ params }: PageProps<"/visit/rentals/[id]">) {
  const { id } = await params;
  return <RentalStatusView id={id} />;
}
