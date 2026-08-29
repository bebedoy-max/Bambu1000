import { blocksFromMarkdown, blocksFromPlainText, extractArticle, extractStructured, isUsableArticle } from "./article-extract";
import { resolveGoogleNewsUrl } from "./google-news.server";

type ArticleContent = {
  title: string;
  blocks: { tag: string; text: string }[];
  sourceUrl: string;
};

type ReaderInput = { url: string; headline?: string; source?: string };

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function fetchText(url: string, userAgent = BROWSER_UA, timeout = 12_000) {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en;q=0.8",
      referer: "https://news.google.com/",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) return null;
  return response.text();
}

const normalize = (value: string) => value.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g, " ").trim();

/** Situs Tribrata kerap memblokir server, tetapi artikelnya juga diterbitkan
 * pada kanal resmi Polres Blitar Kota. Ambil salinan yang judulnya sama. */
async function readOfficialMirror(sourceUrl: string, headline: string) {
  let hostname = "";
  try {
    hostname = new URL(sourceUrl).hostname;
  } catch {
    return null;
  }
  if (!hostname.includes("tribratanews") || !headline) return null;

  const searchUrl = `https://proklamatornews.com/wp-json/wp/v2/search?search=${encodeURIComponent(headline)}&per_page=10`;
  const raw = await fetchText(searchUrl);
  if (!raw) return null;
  const results = JSON.parse(raw) as { id?: number; title?: string }[];
  const wanted = normalize(headline);
  const match = results.find((item) => item.id && normalize(item.title ?? "") === wanted);
  if (!match?.id) return null;

  const postRaw = await fetchText(`https://proklamatornews.com/wp-json/wp/v2/posts/${match.id}`);
  if (!postRaw) return null;
  const post = JSON.parse(postRaw) as { title?: { rendered?: string }; content?: { rendered?: string } };
  const html = post.content?.rendered ?? "";
  const parsed = extractArticle(`<article><h1>${post.title?.rendered ?? headline}</h1>${html}</article>`);
  return isUsableArticle(parsed.blocks, parsed.title) ? parsed : null;
}

export async function readArticle(data: ReaderInput): Promise<ArticleContent> {
  let sourceUrl = data.url;
  let title = "";
  let structuredBlocks: ArticleContent["blocks"] = [];

  try {
    sourceUrl = await resolveGoogleNewsUrl(data.url);
  } catch {
    // URL masukan mungkin sudah merupakan URL penerbit.
  }

  const attempts = [
    { url: sourceUrl, ua: BROWSER_UA },
    { url: sourceUrl, ua: GOOGLEBOT_UA },
    { url: sourceUrl.replace(/\/?$/, "/amp"), ua: BROWSER_UA },
  ];

  for (const attempt of attempts) {
    try {
      const html = await fetchText(attempt.url, attempt.ua);
      if (!html) continue;
      const parsed = extractArticle(html);
      title = parsed.title || title;
      if (isUsableArticle(parsed.blocks, parsed.title)) return { title, blocks: parsed.blocks, sourceUrl };

      if (structuredBlocks.length === 0) {
        const meta = extractStructured(html);
        title = title || meta.title;
        const body = blocksFromPlainText(meta.body);
        structuredBlocks = body.length ? body : blocksFromPlainText(meta.description);
      }
    } catch {
      // Coba mode pembaca berikutnya.
    }
  }

  try {
    const response = await fetch(`https://r.jina.ai/${sourceUrl}`, {
      headers: { "user-agent": BROWSER_UA, accept: "text/plain", "x-return-format": "markdown" },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      const markdown = await response.text();
      const markdownTitle = /^Title:\s*(.+)$/m.exec(markdown)?.[1]?.trim() ?? "";
      const body = markdown.replace(/^[\s\S]*?Markdown Content:\s*/, "");
      const blocks = blocksFromMarkdown(body, markdownTitle || title);
      if (isUsableArticle(blocks, markdownTitle || title)) {
        return { title: title || markdownTitle, blocks, sourceUrl };
      }
    }
  } catch {
    // Coba salinan resmi berikutnya.
  }

  try {
    const mirrored = await readOfficialMirror(sourceUrl, data.headline ?? title);
    if (mirrored) return { title: mirrored.title || data.headline || title, blocks: mirrored.blocks, sourceUrl };
  } catch {
    // Tidak ada salinan resmi yang cocok.
  }

  if (structuredBlocks.length) return { title: title || data.headline || "", blocks: structuredBlocks, sourceUrl };

  return { title: data.headline || title, blocks: [], sourceUrl };
}