import { hasDatabase, query } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { getLocalIsoDate } from "@/lib/dates";
import type { HabitStatus, PrayerItemType } from "@/lib/domain";
import { getDemoTodayPayload, type OfficeGuide } from "@/lib/demo-data";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth } from "@/server/auth";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LiturgicalDayRow = {
  id: string;
  title: string;
  season: string;
  week_of_season: number;
  psalter_week: number;
  rank: string;
  color: string | null;
};

type OfficeGuideRow = {
  hour_type: PrayerItemType;
  volume: string | null;
  psalter_week: number | null;
  general_note: string | null;
  step_order: number;
  section_type: string;
  page_start: number | null;
  instruction: string;
  copyright_safe_note: string | null;
  content_license_status: "metadata_only";
};

export async function GET(request: Request) {
  const fallback = getDemoTodayPayload();

  if (!hasDatabase()) {
    return Response.json(fallback);
  }

  const auth = resolveAuth(request);

  if (!auth) {
    return jsonError("Authentication required.", 401);
  }

  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  const localDate = getLocalIsoDate(user.timezone);

  const dayResult = await query<LiturgicalDayRow>(
    `
      select
        id,
        title,
        season,
        week_of_season,
        psalter_week,
        rank,
        color
      from liturgical_day
      where local_date = $1
        and country = $2
        and (diocese is not distinct from $3 or diocese is null)
      order by (diocese is null) asc
      limit 1
    `,
    [localDate, user.country, user.diocese],
  );

  const liturgicalDay = dayResult.rows[0];

  const officeGuides = liturgicalDay
    ? await getOfficeGuides(liturgicalDay.id)
    : fallback.officeGuides;

  const userState = await withUserTransaction(user.id, async (client) => {
    const rule = await client.query<{
      enabled_items: PrayerItemType[];
      difficulty_level: number;
    }>(
      `
        select enabled_items::text[] as enabled_items, difficulty_level
        from prayer_rule
        where user_id = $1
        order by created_at desc
        limit 1
      `,
      [user.id],
    );

    const prayerRule =
      rule.rows[0] ??
      (
        await client.query<{
          enabled_items: PrayerItemType[];
          difficulty_level: number;
        }>(
          `
            insert into prayer_rule (user_id, enabled_items)
            values (
              $1,
              array['morning_prayer', 'night_prayer']::prayer_item_type[]
            )
            returning enabled_items::text[] as enabled_items, difficulty_level
          `,
          [user.id],
        )
      ).rows[0];

    const habits = await client.query<{
      item_type: PrayerItemType;
      status: HabitStatus;
    }>(
      `
        select item_type::text as item_type, status::text as status
        from habit_log
        where user_id = $1
          and local_date = $2
      `,
      [user.id, localDate],
    );

    return {
      prayerRule,
      habitLog: Object.fromEntries(
        habits.rows.map((row) => [row.item_type, row.status]),
      ) as Partial<Record<PrayerItemType, HabitStatus>>,
    };
  });

  return Response.json({
    ...fallback,
    mode: "database",
    localDate,
    profile: {
      displayName: user.display_name,
      timezone: user.timezone,
      country: user.country,
      diocese: user.diocese,
      formationStage: user.formation_stage,
    },
    liturgicalDay: liturgicalDay
      ? {
          title: liturgicalDay.title,
          season: liturgicalDay.season,
          weekOfSeason: liturgicalDay.week_of_season,
          psalterWeek: liturgicalDay.psalter_week,
          rank: liturgicalDay.rank,
          color: liturgicalDay.color ?? "Green",
        }
      : fallback.liturgicalDay,
    prayerRule: {
      enabledItems: userState.prayerRule.enabled_items,
      difficultyLevel: userState.prayerRule.difficulty_level,
    },
    habitLog: userState.habitLog,
    officeGuides,
  });
}

async function getOfficeGuides(liturgicalDayId: string): Promise<OfficeGuide[]> {
  const rows = await query<OfficeGuideRow>(
    `
      select
        og.hour_type::text as hour_type,
        bv.title as volume,
        ld.psalter_week,
        og.general_note,
        ogs.step_order,
        ogs.section_type,
        ogs.page_start,
        ogs.instruction,
        ogs.copyright_safe_note,
        ogs.content_license_status
      from office_guide og
      join liturgical_day ld on ld.id = og.liturgical_day_id
      left join breviary_volume bv on bv.id = og.volume_id
      join office_guide_step ogs on ogs.office_guide_id = og.id
      where og.liturgical_day_id = $1
      order by og.hour_type, ogs.step_order
    `,
    [liturgicalDayId],
  );

  const grouped = new Map<PrayerItemType, OfficeGuide>();

  for (const row of rows.rows) {
    const guide =
      grouped.get(row.hour_type) ??
      ({
        hourType: row.hour_type,
        volume: row.volume ?? "Volume III",
        psalterWeek: row.psalter_week ?? 2,
        generalNote:
          row.general_note ?? "Use the physical breviary for the prayer text.",
        steps: [],
      } satisfies OfficeGuide);

    guide.steps.push({
      order: row.step_order,
      sectionType: row.section_type,
      pageStart: row.page_start,
      instruction: row.instruction,
      copyrightSafeNote: row.copyright_safe_note ?? "Metadata only.",
      contentLicenseStatus: "metadata_only",
    });

    grouped.set(row.hour_type, guide);
  }

  return Array.from(grouped.values());
}
