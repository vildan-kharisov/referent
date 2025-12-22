import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

type Mode = "about" | "thesis" | "telegram" | null;

interface AnalyzeRequestBody {
  url?: string;
  mode?: Mode;
}

function normalizeWhitespace(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function extractTitle($: cheerio.CheerioAPI): string {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle) return normalizeWhitespace(ogTitle);

  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  if (twitterTitle) return normalizeWhitespace(twitterTitle);

  const h1 = $("h1").first().text();
  if (h1) return normalizeWhitespace(h1);

  const title = $("title").first().text();
  return normalizeWhitespace(title);
}

function extractDate($: cheerio.CheerioAPI): string {
  const metaDateProps = [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publish_date"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]'
  ];

  for (const selector of metaDateProps) {
    const value = $(selector).attr("content") || $(selector).attr("value");
    if (value && normalizeWhitespace(value)) {
      return normalizeWhitespace(value);
    }
  }

  const timeEl = $("time[datetime]").first();
  if (timeEl.length) {
    const dt = timeEl.attr("datetime") || timeEl.text();
    if (dt) return normalizeWhitespace(dt);
  }

  const dateEl = $('[itemprop="datePublished"]').first();
  if (dateEl.length) {
    const dt = dateEl.attr("datetime") || dateEl.text();
    if (dt) return normalizeWhitespace(dt);
  }

  return "";
}

function extractContent($: cheerio.CheerioAPI): string {
  const candidates = [
    "article",
    "main article",
    "main",
    ".post",
    ".post-content",
    ".entry-content",
    ".article-content",
    ".content",
    "#content"
  ];

  for (const selector of candidates) {
    const el = $(selector).first();
    if (el.length) {
      const text = normalizeWhitespace(el.text());
      if (text.length > 200) {
        return text;
      }
    }
  }

  const bodyText = normalizeWhitespace($("body").text());
  return bodyText;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeRequestBody;
    const url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Поле `url` обязательно и должно быть строкой." },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "Не удалось выполнить запрос к указанному URL. Проверьте корректность адреса и доступность сайта."
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Удалённый сервер вернул статус ${response.status}.`
        },
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = extractTitle($);
    const date = extractDate($);
    const content = extractContent($);

    return NextResponse.json({
      date: date || null,
      title: title || null,
      content: content || null
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      {
        error:
          "Произошла внутренняя ошибка при разборе статьи. Попробуйте ещё раз позже."
      },
      { status: 500 }
    );
  }
}


