const FEEDS = [
  {
    source: "WIRED",
    url: "https://www.wired.com/feed/rss"
  },
  {
    source: "TechCrunch AI",
    url: "https://techcrunch.com/tag/artificial-intelligence/feed/"
  }
];

const KEYWORDS = [
  "ai",
  "artificial intelligence",
  "openai",
  "anthropic",
  "microsoft",
  "google",
  "software",
  "developer",
  "dev",
  "code",
  "cloud",
  "security",
  "product",
  "productivity",
  "agent",
  "model",
  "startup"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/blog-feed") {
      return getBlogFeedResponse();
    }

    return env.ASSETS.fetch(request);
  }
};

async function getBlogFeedResponse() {
  try {
    const feeds = await Promise.all(FEEDS.map(fetchFeed));
    const items = dedupeAndSort(feeds.flat()).slice(0, 6);

    return new Response(JSON.stringify({ items }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Unable to load feed." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; InfoyashBot/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.url}`);
  }

  const xml = await response.text();
  const entries = extractEntries(xml);

  return entries
    .map((entry) => normalizeEntry(entry, feed.source))
    .filter(Boolean)
    .filter((entry) => matchesKeywords(entry.title, entry.summary));
}

function normalizeEntry(entry, source) {
  const title = extractTagValue(entry, "title");
  const summary = extractTagValue(entry, "description") || extractTagValue(entry, "summary") || extractTagValue(entry, "content");
  const link = extractLinkValue(entry);
  const publishedAt = extractDateValue(entry);

  if (!title || !link) {
    return null;
  }

  return {
    title,
    summary: stripMarkup(summary).slice(0, 180),
    link,
    source,
    publishedAt
  };
}

function extractEntries(xml) {
  const rssEntries = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  return [...rssEntries, ...atomEntries];
}

function extractTagValue(entry, tagName) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\s\S]*?)<\/${tagName}>`, "i");
  const match = entry.match(pattern);

  if (!match) {
    return "";
  }

  return stripMarkup(match[1]);
}

function extractLinkValue(entry) {
  const atomLink = entry.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLink) {
    return atomLink[1].trim();
  }

  const rssLink = extractTagValue(entry, "link");
  return rssLink.trim();
}

function extractDateValue(entry) {
  const raw = extractTagValue(entry, "pubDate") || extractTagValue(entry, "published") || extractTagValue(entry, "updated") || extractTagValue(entry, "dc:date");
  const timestamp = Date.parse(raw);

  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

function matchesKeywords(title, summary) {
  const haystack = `${title} ${summary}`.toLowerCase();
  return KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function stripMarkup(value) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeAndSort(items) {
  const seen = new Set();

  return items
    .filter((item) => {
      if (seen.has(item.link)) {
        return false;
      }
      seen.add(item.link);
      return true;
    })
    .sort((first, second) => second.publishedAt - first.publishedAt);
}
