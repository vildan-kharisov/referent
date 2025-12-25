/**
 * Утилита для работы с AI-провайдерами
 * Поддерживает YandexGPT и OpenRouter как fallback
 */

export type AIProvider = "yandex" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model?: string;
}

/**
 * Разбивает длинный текст на части (chunks) для обработки
 * @param text - текст для разбиения
 * @param maxLength - максимальная длина части (по умолчанию 8000 символов)
 * @returns массив частей текста
 */
export function chunkText(text: string, maxLength: number = 8000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  // Разбиваем по предложениям для более естественного разделения
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentChunk = "";
  for (const sentence of sentences) {
    // Если добавление предложения превысит лимит, сохраняем текущий chunk
    if (currentChunk.length + sentence.length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // Добавляем последний chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Вызывает YandexGPT API
 */
async function callYandexGPT(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  const apiKey = process.env.YANDEX_GPT_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;

  if (!apiKey || !folderId) {
    throw new Error(
      "YandexGPT API ключ или Folder ID не настроены. Добавьте YANDEX_GPT_API_KEY и YANDEX_FOLDER_ID в .env.local"
    );
  }

  const model = config.model || "yandexgpt/latest";

  const response = await fetch(
    `https://llm.api.cloud.yandex.net/foundationModels/v1/completion`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${apiKey}`,
        "x-folder-id": folderId
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/${model}`,
        completionOptions: {
          stream: false,
          temperature: config.temperature ?? 0.6,
          maxTokens: config.maxTokens ?? 2000
        },
        messages: messages.map(msg => ({
          role: msg.role === "system" ? "system" : msg.role,
          text: msg.content
        }))
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `YandexGPT API error: ${response.status}. ${errorData?.message || "Проверьте API ключ и баланс."}`
    );
  }

  const data = await response.json();
  const content = data.result?.alternatives?.[0]?.message?.text;

  if (!content) {
    throw new Error("Не удалось получить ответ от YandexGPT API.");
  }

  return {
    content,
    provider: "yandex",
    model
  };
}

/**
 * Вызывает OpenRouter API
 */
async function callOpenRouter(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenRouter API ключ не настроен. Добавьте OPENROUTER_API_KEY в .env.local"
    );
  }

  const model = config.model || "deepseek/deepseek-chat";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    },
    body: JSON.stringify({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: config.temperature ?? 0.6,
      max_tokens: config.maxTokens ?? 2000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error: ${response.status}. ${errorData?.error?.message || "Проверьте API ключ и баланс."}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Не удалось получить ответ от OpenRouter API.");
  }

  return {
    content,
    provider: "openrouter",
    model
  };
}

/**
 * Универсальная функция для вызова AI
 * Поддерживает несколько провайдеров с автоматическим fallback
 *
 * @param messages - массив сообщений для AI
 * @param config - конфигурация AI (провайдер, модель, параметры)
 * @param retries - количество попыток при ошибке (по умолчанию 2)
 * @returns ответ от AI
 */
export async function callAI(
  messages: AIMessage[],
  config: Partial<AIConfig> = {},
  retries: number = 2
): Promise<AIResponse> {
  const defaultConfig: AIConfig = {
    provider: "yandex",
    temperature: 0.6,
    maxTokens: 2000,
    ...config
  };

  const providers: AIProvider[] = [defaultConfig.provider];
  // Добавляем fallback провайдер
  if (defaultConfig.provider === "yandex") {
    providers.push("openrouter");
  } else {
    providers.push("yandex");
  }

  let lastError: Error | null = null;

  // Пробуем каждый провайдер
  for (const provider of providers) {
    const currentConfig: AIConfig = { ...defaultConfig, provider };

    // Пробуем с retry
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (provider === "yandex") {
          return await callYandexGPT(messages, currentConfig);
        } else if (provider === "openrouter") {
          return await callOpenRouter(messages, currentConfig);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `AI call attempt ${attempt + 1} failed for ${provider}:`,
          lastError.message
        );

        // Если это последняя попытка для этого провайдера, пробуем следующий
        if (attempt === retries) {
          break;
        }

        // Ждем перед следующей попыткой (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // Если все провайдеры не сработали
  throw new Error(
    `Не удалось получить ответ от AI. Последняя ошибка: ${lastError?.message || "Неизвестная ошибка"}`
  );
}

/**
 * Обрабатывает длинный текст через AI с разбиением на части
 * Полезно для больших статей, которые превышают лимиты токенов
 *
 * @param text - текст для обработки
 * @param systemPrompt - системный промпт
 * @param userPromptTemplate - шаблон пользовательского промпта (будет заменен {text})
 * @param config - конфигурация AI
 * @returns обработанный текст
 */
export async function processLongText(
  text: string,
  systemPrompt: string,
  userPromptTemplate: string = "Обработай следующий текст:\n\n{text}",
  config: Partial<AIConfig> = {}
): Promise<string> {
  const chunks = chunkText(text, 8000);

  // Если текст короткий, обрабатываем сразу
  if (chunks.length === 1) {
    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPromptTemplate.replace("{text}", chunks[0]) }
    ];
    const response = await callAI(messages, config);
    return response.content;
  }

  // Если текст длинный, обрабатываем по частям и объединяем результаты
  const results: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isFirst = i === 0;
    const isLast = i === chunks.length - 1;

    let prompt = userPromptTemplate.replace("{text}", chunk);
    if (!isFirst) {
      prompt = `Это часть ${i + 1} из ${chunks.length} статьи. ${prompt}`;
    }
    if (!isLast) {
      prompt += "\n\nОбработай только эту часть, не делай выводов о целом тексте.";
    }

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];

    const response = await callAI(messages, config);
    results.push(response.content);

    // Небольшая задержка между запросами, чтобы не превысить rate limits
    if (!isLast) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Объединяем результаты
  return results.join("\n\n");
}

