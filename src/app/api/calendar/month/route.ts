import { hasDatabase, query } from "@/db/db";
import { getMonthBounds } from "@/lib/dates";
import { getDemoCalendarMonth } from "@/lib/demo-data";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CalendarRow = {
  local_date: string;
  title: string;
  season: string;
  rank: string;
  color: string | null;
  psalter_week: number | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    return jsonError("Invalid year.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return jsonError("Invalid month.");
  }

  if (!hasDatabase()) {
    return Response.json({
      year,
      month,
      mode: "demo",
      days: getDemoCalendarMonth(year, month),
    });
  }

  const { first, last } = getMonthBounds(year, month);
  const result = await query<CalendarRow>(
    `
      select
        local_date::text as local_date,
        title,
        season,
        rank,
        color,
        psalter_week
      from liturgical_day
      where local_date between $1 and $2
        and country = 'US'
      order by local_date asc
    `,
    [first, last],
  );

  return Response.json({
    year,
    month,
    mode: "database",
    days: result.rows.map((day) => ({
      localDate: day.local_date,
      title: day.title,
      season: day.season,
      rank: day.rank,
      color: day.color,
      psalterWeek: day.psalter_week,
    })),
  });
}
