import { dataError, readDataState } from "@/server/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return Response.json(readDataState()); }
  catch (error) { return dataError(error); }
}
