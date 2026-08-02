import type { Metadata } from "next";
import { RosaryGuide } from "@/components/rosary-guide";
import {
  getRecommendedMysterySet,
  getWeekdayName,
  MYSTERY_SETS,
} from "@/lib/rosary";
import { loadScripturePassage } from "@/server/scripture-passages";
import { getTodayPayload } from "@/server/today";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Most Holy Rosary",
  description:
    "Pray the Most Holy Rosary bead by bead with the mysteries, Sacred Scripture, and the traditional prayers of the Church.",
};

export default async function RosaryPage() {
  const today = await getTodayPayload();
  const currentDate = new Date(`${today.localDate}T12:00:00`);
  const recommendedSet = getRecommendedMysterySet(
    currentDate,
    today.liturgicalDay.season,
  );
  const scriptureExcerpts = await loadRosaryScriptureExcerpts();

  return (
    <main className="rosary-page min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[94rem] px-3 py-3 sm:px-5 sm:py-5 lg:px-7">
        <RosaryGuide
          liturgicalSeason={today.liturgicalDay.season}
          localDate={today.localDate}
          recommendedSetId={recommendedSet.id}
          scriptureExcerpts={scriptureExcerpts}
          weekday={getWeekdayName(currentDate)}
        />
      </div>
    </main>
  );
}

async function loadRosaryScriptureExcerpts() {
  const entries = await Promise.all(
    MYSTERY_SETS.flatMap((mysterySet) => mysterySet.mysteries).map(
      async (mystery) => {
        const passage = await loadScripturePassage(mystery.scripturePassage);
        const text = passage.verses
          .map((verse) => verse.text.trim())
          .filter(Boolean)
          .join(" ");

        return [mystery.id, text] as const;
      },
    ),
  );

  return Object.fromEntries(entries);
}
