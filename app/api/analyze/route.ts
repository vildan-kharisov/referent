import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { callAI, processLongText, type AIMessage } from "../../lib/ai";

type Mode = "parse" | "about" | "thesis" | "telegram" | "translate" | null;

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

    // Если режим "parse" - возвращаем JSON с данными парсинга
    if (body.mode === "parse") {
      return NextResponse.json({
        date: date || null,
        title: title || null,
        content: content || null
      });
    }

    // Если режим "translate" - переводим через Yandex Translate API (или OpenRouter как fallback)
    if (body.mode === "translate") {
      // Формируем текст для перевода (заголовок + контент)
      const textToTranslate = [title, content].filter(Boolean).join("\n\n");

      if (!textToTranslate.trim()) {
        return NextResponse.json(
          { error: "Не удалось извлечь текст статьи для перевода." },
          { status: 400 }
        );
      }

      // Пробуем сначала Yandex Translate API (доступен в России)
      const yandexApiKey = process.env.YANDEX_TRANSLATE_API_KEY;
      if (yandexApiKey) {
        try {
          // Yandex Translate API имеет лимит на длину текста, разбиваем на части если нужно
          const maxLength = 10000;
          const texts = [];
          if (textToTranslate.length <= maxLength) {
            texts.push(textToTranslate);
          } else {
            // Разбиваем на предложения
            const sentences = textToTranslate.match(/[^.!?]+[.!?]+/g) || [textToTranslate];
            let currentChunk = "";
            for (const sentence of sentences) {
              if ((currentChunk + sentence).length > maxLength && currentChunk) {
                texts.push(currentChunk);
                currentChunk = sentence;
              } else {
                currentChunk += sentence;
              }
            }
            if (currentChunk) texts.push(currentChunk);
          }

          const translatedParts: string[] = [];
          for (const text of texts) {
            const yandexResponse = await fetch(
              `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${yandexApiKey}&text=${encodeURIComponent(text)}&lang=en-ru&format=html`,
              { method: "POST" }
            );

            if (yandexResponse.ok) {
              const yandexData = await yandexResponse.json();
              if (yandexData.text && yandexData.text[0]) {
                translatedParts.push(yandexData.text[0]);
              }
            } else {
              throw new Error(`Yandex API вернул статус ${yandexResponse.status}`);
            }
          }

          const translatedText = translatedParts.join(" ");

          return NextResponse.json({
            original: {
              date: date || null,
              title: title || null,
              content: content || null
            },
            translated: translatedText
          });
        } catch (error) {
          console.error("Yandex Translate API error:", error);
          // Продолжаем к fallback варианту
        }
      }

      // Fallback: пробуем OpenRouter AI (если доступен)
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      if (openRouterApiKey) {
        try {
          const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            },
            body: JSON.stringify({
              model: "deepseek/deepseek-chat",
              messages: [
                {
                  role: "system",
                  content: "Ты профессиональный переводчик. Переведи следующий текст с английского на русский язык, сохраняя структуру и стиль оригинала."
                },
                {
                  role: "user",
                  content: textToTranslate
                }
              ],
              temperature: 0.3
            })
          });

          if (openRouterResponse.ok) {
            const openRouterData = await openRouterResponse.json();
            const translatedText =
              openRouterData?.choices?.[0]?.message?.content ||
              "Не удалось получить перевод от API.";

            return NextResponse.json({
              original: {
                date: date || null,
                title: title || null,
                content: content || null
              },
              translated: translatedText
            });
          } else {
            const errorData = await openRouterResponse.json().catch(() => ({}));
            console.error("OpenRouter API error:", errorData);
            throw new Error(`OpenRouter недоступен: ${openRouterResponse.status}`);
          }
        } catch (error) {
          console.error("OpenRouter API error:", error);
        }
      }

      // Fallback: пробуем бесплатный вариант через Google Translate (без API ключа)
      try {
        // Используем неофициальный API Google Translate (может быть нестабильным)
        const googleTranslateResponse = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(textToTranslate)}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0"
            }
          }
        );

        if (googleTranslateResponse.ok) {
          const googleData = await googleTranslateResponse.json();
          if (googleData && googleData[0] && googleData[0][0] && googleData[0][0][0]) {
            const translatedText = googleData[0].map((item: any[]) => item[0]).join("");

            return NextResponse.json({
              original: {
                date: date || null,
                title: title || null,
                content: content || null
              },
              translated: translatedText,
              note: "Перевод выполнен через бесплатный сервис. Для более качественного перевода настройте YANDEX_TRANSLATE_API_KEY в .env.local"
            });
          }
        }
      } catch (error) {
        console.error("Google Translate fallback error:", error);
      }

      // Если все варианты недоступны
      return NextResponse.json(
        {
          error: `API перевода не настроены.\n\nДля настройки:\n1. Получите бесплатный API ключ Yandex Translate: https://translate.yandex.ru/developers/keys\n2. Создайте файл .env.local в корне проекта\n3. Добавьте строку: YANDEX_TRANSLATE_API_KEY=ваш-ключ-здесь\n4. Перезапустите сервер (pnpm dev)`
        },
        { status: 500 }
      );
    }

    // Если режим "about" - генерируем краткое описание статьи через AI
    if (body.mode === "about") {
      const textToAnalyze = [title, content].filter(Boolean).join("\n\n");

      if (!textToAnalyze.trim()) {
        return NextResponse.json(
          { error: "Не удалось извлечь текст статьи для анализа." },
          { status: 400 }
        );
      }

      try {
        const systemPrompt =
          "Ты - эксперт по анализу текстов. Прочитай следующую статью и напиши краткое описание на русском языке (2-3 предложения), объясняющее основную тему и ключевые идеи статьи. Будь точным и информативным.";

        const userPrompt = `Проанализируй следующую статью и напиши краткое описание:\n\nЗаголовок: ${title || "Не указан"}\n\nСодержание:\n${content}`;

        const messages: AIMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ];

        // Используем processLongText для больших статей, callAI для коротких
        let summary: string;
        if (textToAnalyze.length > 8000) {
          summary = await processLongText(
            textToAnalyze,
            systemPrompt,
            "Проанализируй следующую часть статьи и напиши краткое описание основных идей:\n\n{text}",
            {
              provider: "yandex",
              temperature: 0.5,
              maxTokens: 500
            }
          );
        } else {
          const aiResponse = await callAI(messages, {
            provider: "yandex",
            temperature: 0.5,
            maxTokens: 500
          });
          summary = aiResponse.content;
        }

        return NextResponse.json({
          summary: summary.trim(),
          original: {
            date: date || null,
            title: title || null,
            content: content || null
          }
        });
      } catch (error) {
        console.error("AI summary generation error:", error);
        return NextResponse.json(
          {
            error: `Не удалось сгенерировать описание статьи. ${error instanceof Error ? error.message : "Проверьте настройку AI-провайдера в .env.local"}`
          },
          { status: 500 }
        );
      }
    }

    // Если режим "thesis" - извлекаем ключевые тезисы через AI
    if (body.mode === "thesis") {
      const textToAnalyze = [title, content].filter(Boolean).join("\n\n");

      if (!textToAnalyze.trim()) {
        return NextResponse.json(
          { error: "Не удалось извлечь текст статьи для извлечения тезисов." },
          { status: 400 }
        );
      }

      try {
        const systemPrompt =
          "Ты - эксперт по анализу текстов. Прочитай следующую статью и выдели 5-7 ключевых тезисов на русском языке. Каждый тезис должен быть в отдельной строке и начинаться с дефиса (-). Тезисы должны отражать основные идеи и выводы статьи. Будь конкретным и информативным.";

        const userPrompt = `Проанализируй следующую статью и выдели ключевые тезисы:\n\nЗаголовок: ${title || "Не указан"}\n\nСодержание:\n${content}`;

        const messages: AIMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ];

        // Используем processLongText для больших статей, callAI для коротких
        let thesisText: string;
        if (textToAnalyze.length > 8000) {
          thesisText = await processLongText(
            textToAnalyze,
            systemPrompt,
            "Проанализируй следующую часть статьи и выдели ключевые тезисы:\n\n{text}",
            {
              provider: "yandex",
              temperature: 0.4,
              maxTokens: 800
            }
          );
        } else {
          const aiResponse = await callAI(messages, {
            provider: "yandex",
            temperature: 0.4,
            maxTokens: 800
          });
          thesisText = aiResponse.content;
        }

        // Парсим тезисы из ответа AI (разделяем по строкам и фильтруем пустые)
        const thesisLines = thesisText
          .split(/\n+/)
          .map(line => line.trim())
          .filter(line => {
            // Оставляем строки, которые выглядят как тезисы (начинаются с дефиса, цифры, или содержат текст)
            return (
              line.length > 10 &&
              (line.startsWith("-") ||
                line.startsWith("—") ||
                line.match(/^\d+[\.\)]/) ||
                line.match(/^[•\*]/) ||
                line.length > 20)
            );
          })
          .map(line => {
            // Убираем маркеры списка в начале строки
            return line.replace(/^[-—•\*\d+\.\)]\s*/, "").trim();
          })
          .filter(line => line.length > 0);

        // Если не удалось распарсить, возвращаем исходный текст
        const thesis = thesisLines.length > 0 ? thesisLines : [thesisText.trim()];

        return NextResponse.json({
          thesis: thesis,
          thesisText: thesisText.trim(), // Оригинальный текст для отображения
          original: {
            date: date || null,
            title: title || null,
            content: content || null
          }
        });
      } catch (error) {
        console.error("AI thesis extraction error:", error);
        return NextResponse.json(
          {
            error: `Не удалось извлечь тезисы из статьи. ${error instanceof Error ? error.message : "Проверьте настройку AI-провайдера в .env.local"}`
          },
          { status: 500 }
        );
      }
    }

    // Для остальных режимов пока возвращаем парсинг
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


