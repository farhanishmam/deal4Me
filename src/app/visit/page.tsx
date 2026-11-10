import { redirect } from "next/navigation";

// Visitors start on the home screen, with no language or trip setup first.
export default function Page() {
  redirect("/visit/home");
}
