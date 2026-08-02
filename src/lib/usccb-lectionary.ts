export type UsccbLectionarySection = {
  id: string;
  title: string;
  citation: string;
  lines: string[];
  officialUrl: string | null;
};

export type UsccbLectionaryItem = {
  localDate: string;
  title: string;
  link: string;
  publishedAt: string | null;
  sections: UsccbLectionarySection[];
  copyright: string;
};

export function parseUsccbLectionaryFeed(rawFeed: string) {
  const feed = extractRssXml(rawFeed);
  if (!feed) {
    return [];
  }

  const channelCopyright = readXmlTag(feed, "copyright");
  if (!channelCopyright) {
    return [];
  }

  const items: UsccbLectionaryItem[] = [];
  const itemPattern = /<item\b[^>]*>([\s\S]*?)<\/item>/giu;

  for (const match of feed.matchAll(itemPattern)) {
    const block = match[1];
    const title = readXmlTag(block, "title");
    const link = normalizeOfficialUrl(readXmlTag(block, "link"));
    const description = readXmlTag(block, "description");
    const publishedAt = readXmlTag(block, "pubDate") || null;
    const localDate = link ? getDateFromUsccbLink(link) : null;
    const sections = description ? parseDescriptionSections(description) : [];

    if (!title || !link || !localDate || sections.length === 0) {
      continue;
    }

    items.push({
      localDate,
      title,
      link,
      publishedAt,
      sections,
      copyright: channelCopyright,
    });
  }

  return items;
}

export function isIsoLectionaryDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) {
    return false;
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return date.toISOString().slice(0, 10) === value;
}

export function extractRssXml(value: string) {
  const start = value.indexOf("<?xml");
  const end = value.lastIndexOf("</rss>");
  if (start < 0 || end < start) {
    return null;
  }
  return value.slice(start, end + "</rss>".length);
}

function parseDescriptionSections(description: string) {
  const sections: UsccbLectionarySection[] = [];
  const sectionPattern =
    /<h4\b[^>]*>([\s\S]*?)<\/h4>\s*<div\b[^>]*class=(?:"[^"]*\bpoetry\b[^"]*"|'[^']*\bpoetry\b[^']*')[^>]*>([\s\S]*?)<\/div>/giu;

  for (const [index, match] of Array.from(
    description.matchAll(sectionPattern),
  ).entries()) {
    const headingHtml = match[1];
    const bodyHtml = match[2];
    const linkMatch = headingHtml.match(
      /<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/iu,
    );
    const officialUrl = normalizeOfficialUrl(
      linkMatch?.[1] ?? linkMatch?.[2] ?? "",
    );
    const citation = linkMatch ? htmlToText(linkMatch[3]) : "";
    const title = htmlToText(
      headingHtml.replace(/<a\b[^>]*>[\s\S]*?<\/a>/iu, ""),
    );
    const lines = htmlToLines(bodyHtml);

    if (!title || !citation || lines.length === 0) {
      continue;
    }

    sections.push({
      id: `${slugify(title)}-${index + 1}`,
      title,
      citation,
      lines,
      officialUrl,
    });
  }

  return sections;
}

function htmlToLines(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/giu, "\n")
    .replace(/<\/p>\s*<p\b[^>]*>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
    .split(/\n+/u)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function htmlToText(value: string) {
  return normalizeText(value.replace(/<[^>]+>/gu, " "));
}

function readXmlTag(value: string, tag: string) {
  const match = value.match(
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "iu"),
  );
  if (!match) {
    return "";
  }

  return normalizeText(
    match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/u, "$1"),
    false,
  );
}

function normalizeText(value: string, collapseWhitespace = true) {
  const decoded = decodeEntities(decodeEntities(value)).replace(/\u00a0/gu, " ");
  return collapseWhitespace
    ? decoded.replace(/\s+/gu, " ").trim()
    : decoded.trim();
}

function decodeEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };

  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/giu,
    (entity, code: string) => {
      if (code.startsWith("#x")) {
        return safeCodePoint(Number.parseInt(code.slice(2), 16), entity);
      }
      if (code.startsWith("#")) {
        return safeCodePoint(Number.parseInt(code.slice(1), 10), entity);
      }
      return namedEntities[code.toLowerCase()] ?? entity;
    },
  );
}

function safeCodePoint(value: number, fallback: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x10ffff) {
    return fallback;
  }
  return String.fromCodePoint(value);
}

function normalizeOfficialUrl(value: string) {
  try {
    const url = new URL(decodeEntities(value.trim()));
    if (
      url.protocol !== "https:" ||
      (url.hostname !== "usccb.org" && !url.hostname.endsWith(".usccb.org"))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function getDateFromUsccbLink(link: string) {
  const match = link.match(/\/(\d{2})(\d{2})(\d{2})(?:\.cfm)?(?:[/?#]|$)/u);
  if (!match) {
    return null;
  }

  const year = 2000 + Number(match[3]);
  const month = Number(match[1]);
  const day = Number(match[2]);
  const localDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isIsoLectionaryDate(localDate) ? localDate : null;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "reading"
  );
}
