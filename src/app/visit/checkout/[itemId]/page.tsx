import { Suspense } from "react";
import { CheckoutView } from "@/components/deals/money/CheckoutView";
import { PhoneSkeleton } from "@/components/deals/money/Parts";

export default async function Page({ params }: PageProps<"/visit/checkout/[itemId]">) {
  const { itemId } = await params;
  return (
    <Suspense fallback={<PhoneSkeleton />}>
      <CheckoutView itemId={itemId} />
    </Suspense>
  );
}
