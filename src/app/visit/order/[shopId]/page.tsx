import { OrderFlow } from "@/components/visitor/order/OrderFlow";

export default async function Page({ params }: PageProps<"/visit/order/[shopId]">) {
  const { shopId } = await params;
  return <OrderFlow shopId={shopId} />;
}
