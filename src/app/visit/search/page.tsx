import { Suspense } from "react";
import { Search } from "@/components/visitor/search/Search";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Search />
    </Suspense>
  );
}
