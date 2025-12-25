"use client";

import { useState } from "react";

type Mode = "parse" | "about" | "thesis" | "telegram" | "translate" | null;

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [activeMode, setActiveMode] = useState<Mode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleClick = async (mode: Mode) => {
    setActiveMode(mode);
    setError(null);
    setResult(null);

    if (!url.trim()) {
      setError("Пожалуйста, введите URL англоязычной статьи.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, mode })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Не удалось разобрать статью. Попробуйте другой URL.");
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
      // Для остальных режимов - JSON
      else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setError("Произошла ошибка сети при обращении к API. Попробуйте ещё раз.");
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
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          Анализ англоязычной статьи
        </h1>
        <p className="text-sm text-slate-400 sm:text-base">
          Вставьте ссылку на англоязычную статью. Затем выберите, что вы хотите получить: краткое
          описание, набор тезисов или пост для Telegram.
        </p>
      </header>

      <section className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          URL статьи
          <input
            type="url"
            placeholder="https://example.com/interesting-article"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 placeholder:text-slate-500"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleClick("parse")}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:flex-none sm:px-4 ${
              activeMode === "parse"
                ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/40"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            Парсить статью
          </button>
          <button
            type="button"
            onClick={() => handleClick("about")}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:flex-none sm:px-4 ${
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
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:flex-none sm:px-4 ${
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
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:flex-none sm:px-4 ${
              activeMode === "telegram"
                ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/40"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            Пост для Telegram
          </button>
          <button
            type="button"
            onClick={() => handleClick("translate")}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 sm:flex-none sm:px-4 ${
              activeMode === "translate"
                ? "bg-sky-500 text-slate-950 shadow shadow-sky-500/40"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            Перевести статью
          </button>
        </div>
      </section>

      {isLoading && (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Генерация ответа
            </h2>
            <span className="text-xs text-sky-400">
              Идёт обработка статьи…
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Мы анализируем текст по указанному URL и подготавливаем {activeMode && getModeLabel(activeMode).toLowerCase()}.
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse bg-sky-500" />
          </div>
        </section>
      )}

      {(error || result || activeMode) && (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              {activeMode ? `Результат: ${getModeLabel(activeMode)}` : "Результат"}
            </h2>
          </div>

          {error && (
            <p className="text-sm text-rose-400">
              {error}
            </p>
          )}

          {result && (
            <pre className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
              {result}
            </pre>
          )}

          {!error && !result && !isLoading && activeMode && (
            <p className="text-sm text-slate-500">
              Выберите действие, чтобы увидеть результат анализа статьи.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
