import { redirect } from "next/navigation";
import { counterpart, isPersona } from "@/rapport/data/people";

export default async function Page({ params }: { params: Promise<{ persona: string }> }) {
  const { persona } = await params;
  const me = isPersona(persona) ? persona : "farhan";
  redirect(`/rapport/${me}/people/${counterpart(me)}`);
}
