import type { Metadata } from "next";
import "./globals.css";
import { ThemeWrapper } from "./components/theme-wrapper";

export const metadata: Metadata = {
  title: "Referent — анализ англоязычных статей",
  description:
    "Вставьте ссылку на англоязычную статью и получите краткое описание, тезисы или пост для Telegram."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-50">
        <ThemeWrapper>
          <div className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-950/70 sm:px-6 sm:py-6">
              {children}
            </div>
          </div>
        </ThemeWrapper>
      </body>
    </html>
  );
}
