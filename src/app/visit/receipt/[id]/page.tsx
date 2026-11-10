import { ReceiptView } from "@/components/deals/money/ReceiptView";

export default async function Page({ params }: PageProps<"/visit/receipt/[id]">) {
  const { id } = await params;
  return <ReceiptView id={id} />;
}
