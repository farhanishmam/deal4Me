import { StudioView } from "../_components/StudioView";

export const metadata = { title: "Studio" };

export default async function Page({ params }: PageProps<"/sell/studio/[shopId]">) {
  const { shopId } = await params;
  return <StudioView shopId={shopId} />;
}
