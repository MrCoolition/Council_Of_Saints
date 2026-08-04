import "server-only";

import {
  extractRssXml,
  isIsoLectionaryDate,
  parseUsccbLectionaryFeed,
  type UsccbLectionaryItem,
  type UsccbLectionarySection,
} from "@/lib/usccb-lectionary";
import { getUsccbDailyReadingsUrl } from "@/lib/mass-readings";
import {
  buildUsccbLectionaryReadingSets,
  parseUsccbReadingPage,
  type UsccbLectionaryReadingSet,
  type UsccbReadingPage,
} from "@/lib/usccb-reading-page";

export type {
  UsccbLectionaryItem,
  UsccbLectionaryReadingSet,
  UsccbLectionarySection,
};

const USCCB_RSS_URL =
  "https://www.usccb.org/bible/readings/rss/index.cfm";
const USCCB_RSS_READER_URL =
  "https://r.jina.ai/http://www.usccb.org/bible/readings/rss/index.cfm";
const FEED_REVALIDATE_SECONDS = 15 * 60;
const READING_PAGE_REVALIDATE_SECONDS = 6 * 60 * 60;

export async function getUsccbLectionaryForDate(
  localDate: string,
): Promise<UsccbLectionaryItem | null> {
  if (!isIsoLectionaryDate(localDate)) {
    return null;
  }

  try {
    const feed = await fetchUsccbFeed();
    return (
      parseUsccbLectionaryFeed(feed).find(
        (item) => item.localDate === localDate,
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function getUsccbLectionaryReadingSetsForDate(
  localDate: string,
): Promise<UsccbLectionaryReadingSet[]> {
  if (!isIsoLectionaryDate(localDate)) {
    return [];
  }

  const officialDailyUrl = getUsccbDailyReadingsUrl(localDate);
  const [feedItem, discoveredDailyPage] = await Promise.all([
    getUsccbLectionaryForDate(localDate),
    fetchUsccbReadingPage(localDate, officialDailyUrl),
  ]);
  const dailyPage = mergeDailySources(
    officialDailyUrl,
    feedItem,
    discoveredDailyPage,
  );

  if (!dailyPage) {
    return [];
  }

  const properPages = (
    await Promise.all(
      dailyPage.relatedReadingPages.map((page) =>
        fetchUsccbReadingPage(localDate, page.url),
      ),
    )
  ).filter((page): page is UsccbReadingPage => page !== null);

  return buildUsccbLectionaryReadingSets(dailyPage, properPages);
}

async function fetchUsccbFeed() {
  const requestOptions = {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
      "User-Agent":
        "Sanctum Council/1.0 (+https://council-of-saints.vercel.app)",
    },
    next: { revalidate: FEED_REVALIDATE_SECONDS },
  } satisfies RequestInit & { next: { revalidate: number } };

  const directResponse = await fetch(USCCB_RSS_URL, requestOptions);
  const directText = await directResponse.text();
  if (directResponse.ok && extractRssXml(directText)) {
    return directText;
  }

  const readerResponse = await fetch(USCCB_RSS_READER_URL, requestOptions);
  if (!readerResponse.ok) {
    throw new Error(`USCCB RSS unavailable (${readerResponse.status})`);
  }

  const readerText = await readerResponse.text();
  if (!extractRssXml(readerText)) {
    throw new Error("USCCB RSS response was not a feed");
  }
  return readerText;
}

async function fetchUsccbReadingPage(
  localDate: string,
  officialUrl: string,
): Promise<UsccbReadingPage | null> {
  let url: URL;

  try {
    url = new URL(officialUrl);
  } catch {
    return null;
  }

  if (
    url.hostname !== "bible.usccb.org" ||
    !url.pathname.startsWith("/bible/readings/")
  ) {
    return null;
  }

  const sourcePath = /\/\d{6}$/u.test(url.pathname)
    ? `${url.pathname}.cfm`
    : url.pathname;
  const readerUrl = `https://r.jina.ai/http://bible.usccb.org${sourcePath}${url.search}`;

  try {
    const response = await fetch(readerUrl, {
      headers: {
        Accept: "text/plain, text/markdown;q=0.9",
        "User-Agent":
          "Sanctum Council/1.0 (+https://council-of-saints.vercel.app)",
      },
      next: { revalidate: READING_PAGE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return null;
    }

    return parseUsccbReadingPage(await response.text(), {
      localDate,
      officialUrl,
    });
  } catch {
    return null;
  }
}

function mergeDailySources(
  officialUrl: string,
  feedItem: UsccbLectionaryItem | null,
  discoveredPage: UsccbReadingPage | null,
): UsccbReadingPage | null {
  if (discoveredPage) {
    return feedItem
      ? {
          ...discoveredPage,
          item: {
            ...feedItem,
            link: discoveredPage.item.link,
          },
        }
      : discoveredPage;
  }

  if (!feedItem) {
    return null;
  }

  return {
    item: { ...feedItem, link: officialUrl },
    lectionaryNumber: null,
    note: null,
    relatedReadingPages: [],
  };
}
