import { getTodayPayload } from "@/server/today";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json(await getTodayPayload(request));
}
