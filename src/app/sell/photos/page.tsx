import { Suspense } from "react";
import { PhotosView } from "@/components/onboarding/photos/PhotosView";

export const metadata = { title: "Add photos" };

export default function Page() {
  return (
    <Suspense>
      <PhotosView />
    </Suspense>
  );
}
