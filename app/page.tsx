"use client";

import { useState } from "react";

type Mode = "about" | "thesis" | "telegram" | null;

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [activeMode, setActiveMode] = useState<Mode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleClick = (mode: Mode) => {
    setActiveMode(mode);
    setError(null);
    setResult(null);

    if (!url.trim()) {
      setError("Пожалуйста, введите URL англоязычной статьи.");
      return;
    }

    // Здесь в будущем будет реальный вызов API:
    // fetch("/api/analyze", { method: "POST", body: JSON.stringify({ url, mode }) })

    setIsLoading(true);

    // Демонстрационный мок-результат вместо реального AI
    setTimeout(() => {
      let demoText = "";

      if (mode === "about") {
        demoText =
          "Это пример описания: кратко объясняем, о чём статья по указанной ссылке. " +
          "При подключении AI здесь будет реальное резюме содержимого.";
      } else if (mode === "thesis") {
        demoText = [
          "— Краткий тезис 1 по содержанию статьи.",
          "— Краткий тезис 2, иллюстрирующий основной аргумент.",
          "— Краткий тезис 3, отражающий выводы автора."
        ].join("\n");
      } else if (mode === "telegram") {
        demoText =
          "Вот пример поста для Telegram на основе статьи.\n\n" +
          "1) Захватывающий заход, который объясняет, почему тема важна.\n" +
          "2) 2–3 ключевых мысли из статьи простым языком.\n" +
          "3) Призыв перейти по ссылке и прочитать оригинал.";
      }

      setResult(demoText);
      setIsLoading(false);
    }, 700);
  };

  const getModeLabel = (mode: Mode) => {
    if (mode === "about") return "О чём статья?";
    if (mode === "thesis") return "Тезисы";
    if (mode === "telegram") return "Пост для Telegram";
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
        </div>
      </section>

      {(error || result || isLoading || activeMode) && (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              {activeMode ? `Результат: ${getModeLabel(activeMode)}` : "Результат"}
            </h2>
            {isLoading && (
              <span className="text-xs text-sky-400">
                Анализируем статью…
              </span>
            )}
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

          {!error && !result && !isLoading && (
            <p className="text-sm text-slate-500">
              Выберите действие, чтобы увидеть результат анализа статьи.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
