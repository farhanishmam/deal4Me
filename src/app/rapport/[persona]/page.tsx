import { redirect } from "next/navigation";
import { isPersona } from "@/rapport/data/people";

export default async function Page({ params }: { params: Promise<{ persona: string }> }) {
  const { persona } = await params;
  redirect(`/rapport/${isPersona(persona) ? persona : "farhan"}/home`);
}
