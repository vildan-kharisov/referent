import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ru">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <div className="flex min-h-screen items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 sm:px-6 sm:py-6 shadow-2xl shadow-slate-950/70 backdrop-blur">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
