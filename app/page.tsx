"use client";

import { useState, useRef, useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";

type Mode = "parse" | "about" | "thesis" | "telegram" | "translate" | null;

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [activeMode, setActiveMode] = useState<Mode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentProcess, setCurrentProcess] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Функция для очистки всех состояний
  const handleClear = () => {
    setUrl("");
    setActiveMode(null);
    setError(null);
    setErrorType(null);
    setResult(null);
    setCopied(false);
    setCurrentProcess(null);
    setIsLoading(false);
  };

  // Функция для преобразования ошибок в дружественные сообщения
  const getFriendlyError = (errorData: any): { message: string; type: string } => {
    const errorType = errorData?.errorType || "unknown";
    const rawError = errorData?.error || "";

    switch (errorType) {
      case "timeout":
        return {
          message: "Не удалось загрузить статью по этой ссылке. Превышено время ожидания.",
          type: "timeout"
        };
      case "network":
        return {
          message: "Не удалось загрузить статью по этой ссылке. Проверьте подключение к интернету.",
          type: "network"
        };
      case "not_found":
        return {
          message: "Не удалось загрузить статью по этой ссылке. Страница не найдена (404).",
          type: "not_found"
        };
      case "server_error":
        return {
          message: "Не удалось загрузить статью по этой ссылке. Ошибка сервера (500+).",
          type: "server_error"
        };
      case "http_error":
        return {
          message: "Не удалось загрузить статью по этой ссылке.",
          type: "http_error"
        };
      case "validation":
        return {
          message: rawError || "Пожалуйста, введите корректный URL статьи.",
          type: "validation"
        };
      case "parsing":
        return {
          message: rawError || "Не удалось извлечь текст из статьи. Возможно, статья не содержит текстового контента.",
          type: "parsing"
        };
      case "ai_error":
        // Для AI ошибок проверяем, есть ли уже дружественное сообщение
        if (rawError.includes("API ключ") || rawError.includes("API key")) {
          return {
            message: "Не удалось обработать статью через AI.\n\nПроверьте настройку AI-провайдера:\n1. Убедитесь, что в .env.local добавлены YANDEX_GPT_API_KEY и YANDEX_FOLDER_ID\n2. Проверьте корректность ключей\n3. Убедитесь, что YandexGPT включен в вашем каталоге",
            type: "ai_error"
          };
        }
        if (rawError.includes("недоступен") || rawError.includes("unavailable")) {
          return {
            message: "AI-провайдер временно недоступен. Попробуйте ещё раз через несколько секунд.",
            type: "ai_error"
          };
        }
        if (rawError.includes("баланс") || rawError.includes("balance")) {
          return {
            message: "Недостаточно средств на балансе AI-провайдера. Пополните баланс и попробуйте снова.",
            type: "ai_error"
          };
        }
        return {
          message: rawError || "Не удалось обработать статью через AI. Попробуйте ещё раз.",
          type: "ai_error"
        };
      default:
        // Если это уже дружественное сообщение, используем его
        if (rawError && !rawError.includes("error") && !rawError.includes("Error")) {
          return {
            message: rawError,
            type: "unknown"
          };
        }
        return {
          message: "Произошла ошибка при обработке статьи. Попробуйте ещё раз.",
          type: "unknown"
        };
    }
  };

  const copyToClipboard = async () => {
    if (result) {
      try {
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleClick = async (mode: Mode) => {
    setActiveMode(mode);
    setError(null);
    setResult(null);
    setCurrentProcess("Загружаю статью...");

    if (!url.trim()) {
      const friendlyError = getFriendlyError({ errorType: "validation" });
      setError(friendlyError.message);
      setErrorType(friendlyError.type);
      setCurrentProcess(null);
      return;
    }

    setIsLoading(true);

    try {
      setCurrentProcess("Парсю статью...");
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, mode })
      });

      setCurrentProcess("Обрабатываю через AI...");
      const data = await response.json();

      if (!response.ok) {
        const friendlyError = getFriendlyError(data);
        setError(friendlyError.message);
        setErrorType(friendlyError.type);
        setCurrentProcess(null);
        return;
      }

      // Для режима перевода показываем перевод
      if (mode === "translate" && data.translated) {
        setResult(data.translated);
      } 
      // Для режима "about" показываем краткое описание
      else if (mode === "about" && data.summary) {
        setResult(data.summary);
      } 
      // Для режима "thesis" показываем тезисы
      else if (mode === "thesis" && data.thesis) {
        // Если тезисы в виде массива, форматируем их
        if (Array.isArray(data.thesis)) {
          setResult(data.thesis.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n"));
        } else {
          setResult(data.thesisText || data.thesis);
        }
      } 
      // Для режима "telegram" показываем пост
      else if (mode === "telegram" && data.telegramPost) {
        setResult(data.telegramPost);
      } 
      // Для остальных режимов - JSON
      else {
        setResult(JSON.stringify(data, null, 2));
      }
      
      setCurrentProcess(null);
      
      // Автоматическая прокрутка к результатам после успешной генерации
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      const friendlyError = getFriendlyError({
        errorType: "network",
        error: "Произошла ошибка сети при обращении к API."
      });
      setError(friendlyError.message);
      setErrorType(friendlyError.type);
      setCurrentProcess(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getModeLabel = (mode: Mode) => {
    if (mode === "parse") return "Парсить статью";
    if (mode === "about") return "О чём статья?";
    if (mode === "thesis") return "Тезисы";
    if (mode === "telegram") return "Пост для Telegram";
    if (mode === "translate") return "Перевести статью";
    return "";
  };

  return (
    <main className="space-y-4 sm:space-y-6">
      <header className="space-y-1.5 sm:space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl md:text-3xl">
          Референт — переводчик с ИИ-обработкой
        </h1>
        <p className="text-xs leading-relaxed text-slate-400 sm:text-sm sm:leading-normal md:text-base">
          Вставьте ссылку на англоязычную статью. Затем выберите, что вы хотите получить: краткое
          описание, набор тезисов или пост для Telegram.
        </p>
      </header>

      <section className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-medium text-slate-200 sm:text-sm">
              URL статьи
            </label>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:px-2.5 sm:py-1.5"
              title="Очистить все поля и результаты"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden min-[375px]:inline">Очистить</span>
            </button>
          </div>
          <input
            type="url"
            placeholder="Введите URL статьи, например: https://example.com/article"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-50 outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 sm:text-sm"
          />
          <p className="text-xs leading-relaxed text-slate-500">
            Укажите ссылку на англоязычную статью
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => handleClick("about")}
            title="Получить краткое описание статьи (2-3 предложения) с основными темами и ключевыми идеями"
            className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:w-auto sm:flex-1 sm:text-sm md:flex-none md:px-4 ${
              activeMode === "about"
                ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/40"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            О чём статья?
          </button>
          <button
            type="button"
            onClick={() => handleClick("thesis")}
            title="Извлечь 5-7 ключевых тезисов из статьи, отражающих основные идеи и выводы"
            className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:w-auto sm:flex-1 sm:text-sm md:flex-none md:px-4 ${
              activeMode === "thesis"
                ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/40"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            Тезисы
          </button>
          <button
            type="button"
            onClick={() => handleClick("telegram")}
            title="Сгенерировать готовый пост для Telegram с захватывающим заголовком, ключевыми мыслями и ссылкой на статью"
            className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:w-auto sm:flex-1 sm:text-sm md:flex-none md:px-4 ${
              activeMode === "telegram"
                ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/40"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            Пост для Telegram
          </button>
        </div>
      </section>

      {currentProcess && (
        <section className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 sm:px-4">
          <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
            {currentProcess}
          </p>
        </section>
      )}

      {isLoading && (
        <section className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 sm:space-y-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <h2 className="text-xs font-semibold text-slate-100 sm:text-sm">
              Генерация ответа
            </h2>
            <span className="text-xs text-sky-400">
              Идёт обработка статьи…
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
            Мы анализируем текст по указанному URL и подготавливаем {activeMode && getModeLabel(activeMode).toLowerCase()}.
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse bg-sky-500" />
          </div>
        </section>
      )}

      {(error || result || activeMode) && (
        <section ref={resultRef} className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 sm:space-y-3 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-semibold text-slate-100 sm:text-sm">
              {activeMode ? `Результат: ${getModeLabel(activeMode)}` : "Результат"}
            </h2>
            {result && (
              <button
                onClick={copyToClipboard}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:w-auto sm:justify-start"
                title="Копировать в буфер обмена"
              >
                {copied ? (
                  <>
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Скопировано
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Копировать
                  </>
                )}
              </button>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="px-3 py-2.5 sm:px-4 sm:py-3">
              <AlertTitle className="text-xs font-medium text-rose-300 sm:text-sm">
                Ошибка
              </AlertTitle>
              <AlertDescription className="mt-1.5 text-xs leading-relaxed text-rose-400 sm:mt-2 sm:text-sm">
                {error.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < error.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="relative">
              <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-xs leading-relaxed text-slate-200 sm:p-3 sm:text-sm">
                {result}
              </pre>
            </div>
          )}

          {!error && !result && !isLoading && activeMode && (
            <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
              Выберите действие, чтобы увидеть результат анализа статьи.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
