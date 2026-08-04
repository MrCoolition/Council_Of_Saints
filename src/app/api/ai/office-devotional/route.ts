import { getOrGenerateDailyOfficeDevotional } from "@/server/ai/office-devotionals";
import { getTodayPayload } from "@/server/today";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const today = await getTodayPayload(request);
  const requestedDate = new URL(request.url).searchParams.get("localDate");

  if (requestedDate && requestedDate !== today.localDate) {
    return Response.json(
      { mode: "fallback", reason: "The liturgical day has changed." },
      { status: 409 },
    );
  }

  const devotional = await getOrGenerateDailyOfficeDevotional(today);

  if (!devotional) {
    return Response.json({
      mode: "fallback",
      reason: "Today’s curated devotional text is being used.",
    });
  }

  return Response.json({ mode: "ai", devotional });
}
