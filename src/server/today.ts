import { hasDatabase } from "@/db/db";
import { withUserTransaction } from "@/db/user-transaction";
import { getLocalIsoDate } from "@/lib/dates";
import type { HabitStatus, PrayerItemType } from "@/lib/domain";
import { getDemoTodayPayload, type TodayPayload } from "@/lib/demo-data";
import { getLiturgicalDay } from "@/lib/liturgical-calendar";
import { getDailyOfficeGuides } from "@/lib/office-psalter";
import { ensureAppUser } from "@/server/app-user";
import { resolveAuth, resolveAuthFromHeaders } from "@/server/auth";

export async function getTodayPayload(request?: Request): Promise<TodayPayload> {
  const fallback = await getCalendarBackedPayload(getLocalIsoDate(), "US");

  if (!hasDatabase()) {
    return fallback;
  }

  const auth = request ? resolveAuth(request) : resolveAuthFromHeaders();
  const user = await ensureAppUser(auth.authSubject, auth.displayName);
  const localDate = getLocalIsoDate(user.timezone);
  const dateFallback = await getCalendarBackedPayload(
    localDate,
    user.country,
  );

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
                'office_readings',
                'morning_prayer',
                'daytime_prayer',
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
  // Calendar metadata is calculated from the bundled, versioned U.S. Roman
  // calendar. Neon stores personal state, but an old seed/cache row must never
  // replace the current observance or Psalter week.
  const resolvedLiturgicalDay = dateFallback.liturgicalDay;

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
      resolvedLiturgicalDay,
    ),
  };
}

async function getCalendarBackedPayload(
  localDate: string,
  country: string,
): Promise<TodayPayload> {
  const fallback = getDemoTodayPayload(localDate);

  try {
    const day = await getLiturgicalDay(localDate, country);
    const liturgicalDay: TodayPayload["liturgicalDay"] = {
      title: day.title,
      season: day.season,
      weekOfSeason: day.weekOfSeason,
      psalterWeek: day.psalterWeek,
      rank: day.rank,
      color: day.color,
      observanceId: day.observanceId,
      weekdayCycle: day.cycles.weekday.label,
      sundayCycle: day.cycles.sunday.label,
      sourceLabel: day.source.label,
      sourceUrl: day.source.urls.authority,
    };

    return {
      ...fallback,
      liturgicalDay,
      officeGuides: getDailyOfficeGuides(
        localDate,
        liturgicalDay.psalterWeek,
        liturgicalDay,
      ),
    };
  } catch (error) {
    console.error("Falling back to local liturgical estimate.", error);
    return fallback;
  }
}
