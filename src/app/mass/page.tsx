import type { Metadata } from "next";
import { HolyMassCompanion } from "@/components/holy-mass-companion";
import {
  getHolyMassPageData,
  type HolyMassPageData,
} from "@/server/holy-mass";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Holy Mass",
  description: "The Order of Mass, today's readings, responses, and postures.",
};

type HolyMassPageProps = {
  searchParams: Promise<{
    fixture?: string | string[];
    form?: string | string[];
  }>;
};

function getSpeechFollowFixtureData(): HolyMassPageData {
  const localDate = "2026-08-30";

  return {
    civilDate: localDate,
    civilTime: "10:00",
    timezone: "America/New_York",
    daytime: {
      id: "speech-follow-ordinary-mass",
      mode: "daytime",
      localDate,
      dateLabel: "Sunday, August 30, 2026",
      title: "Speech-follow test Mass",
      rank: "Sunday",
      season: "Ordinary Time",
      liturgicalColor: "green",
      cycleLabel: null,
      lectionaryNumbers: [],
      profile: {
        id: "speech-follow-sunday",
        label: "Sunday Mass",
        requirements: {
          gloria: true,
          creed: true,
          secondReading: true,
          sprinklingRite: false,
          sequence: "none",
          gospelAcclamation: "alleluia",
        },
      },
      officialReadingsUrl: "https://example.invalid/speech-follow-fixture",
      massLectionary: null,
      readingSets: [],
      options: [],
      propers: null,
      propersByReadingSetId: {},
      riteKind: "ordinary-mass",
    },
    anticipated: null,
  };
}

export default async function HolyMassPage({
  searchParams,
}: HolyMassPageProps) {
  const params = await searchParams;
  const rawForm = Array.isArray(params.form) ? params.form[0] : params.form;
  const rawFixture = Array.isArray(params.fixture)
    ? params.fixture[0]
    : params.fixture;
  const saturdayOverride =
    rawForm === "daytime" || rawForm === "anticipated" ? rawForm : "auto";
  const data =
    process.env.NODE_ENV !== "production" &&
    process.env.PLAYWRIGHT_TEST === "1" &&
    rawFixture === "speech-follow"
      ? getSpeechFollowFixtureData()
      : await getHolyMassPageData();
  return (
    <HolyMassCompanion
      data={data}
      saturdayOverride={saturdayOverride}
    />
  );
}
