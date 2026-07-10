import { hasDatabase, query } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { getLocalIsoDate } from "@/lib/dates";
import type { HabitStatus, PrayerItemType } from "@/lib/domain";
import { getDemoTodayPayload, type TodayPayload } from "@/lib/demo-data";
import { getDailyOfficeGuides } from "@/lib/office-psalter";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth, resolveAuthFromHeaders } from "@/server/auth";

type LiturgicalDayRow = {
  title: string;
  season: string;
  week_of_season: number;
  psalter_week: number;
  rank: string;
  color: string | null;
};

export async function getTodayPayload(request?: Request): Promise<TodayPayload> {
  const fallback = getDemoTodayPayload();

  if (!hasDatabase()) {
    return fallback;
  }

  const auth = request ? resolveAuth(request) : resolveAuthFromHeaders();
  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  const localDate = getLocalIsoDate(user.timezone);
  const dateFallback = getDemoTodayPayload(localDate);

  const dayResult = await query<LiturgicalDayRow>(
    `
      select
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
              array[
                'morning_prayer',
                'evening_prayer',
                'night_prayer'
              ]::prayer_item_type[]
            )
            returning enabled_items::text[] as enabled_items, difficulty_level
          `,
          [user.id],
        )
      ).rows[0];

    const habits = await client.query<{
      local_date: string;
      item_type: PrayerItemType;
      status: HabitStatus;
    }>(
      `
        select
          local_date::text as local_date,
          item_type::text as item_type,
          status::text as status
        from habit_log
        where user_id = $1
          and local_date between ($2::date - interval '6 days') and $2::date
      `,
      [user.id, localDate],
    );
    const habitHistory: TodayPayload["habitHistory"] = {};

    for (const row of habits.rows) {
      habitHistory[row.local_date] = {
        ...(habitHistory[row.local_date] ?? {}),
        [row.item_type]: row.status,
      };
    }

    return {
      prayerRule,
      habitLog: habitHistory[localDate] ?? {},
      habitHistory,
    };
  });
  const resolvedLiturgicalDay = liturgicalDay
    ? {
        title: liturgicalDay.title,
        season: liturgicalDay.season,
        weekOfSeason: liturgicalDay.week_of_season,
        psalterWeek: liturgicalDay.psalter_week,
        rank: liturgicalDay.rank,
        color: liturgicalDay.color ?? "Green",
      }
    : dateFallback.liturgicalDay;

  return {
    ...dateFallback,
    mode: "database",
    profile: {
      displayName: user.display_name,
      timezone: user.timezone,
      country: user.country,
      diocese: user.diocese,
      formationStage: user.formation_stage,
    },
    liturgicalDay: resolvedLiturgicalDay,
    prayerRule: {
      enabledItems: userState.prayerRule.enabled_items,
      difficultyLevel: userState.prayerRule.difficulty_level,
    },
    habitLog: userState.habitLog,
    habitHistory: userState.habitHistory,
    officeGuides: getDailyOfficeGuides(
      localDate,
      resolvedLiturgicalDay.psalterWeek,
    ),
  };
}
