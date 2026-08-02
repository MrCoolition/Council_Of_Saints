import "server-only";

import {
  extractRssXml,
  isIsoLectionaryDate,
  parseUsccbLectionaryFeed,
  type UsccbLectionaryItem,
  type UsccbLectionarySection,
} from "@/lib/usccb-lectionary";

export type { UsccbLectionaryItem, UsccbLectionarySection };

const USCCB_RSS_URL =
  "https://www.usccb.org/bible/readings/rss/index.cfm";
const USCCB_RSS_READER_URL =
  "https://r.jina.ai/http://www.usccb.org/bible/readings/rss/index.cfm";
const FEED_REVALIDATE_SECONDS = 15 * 60;

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
