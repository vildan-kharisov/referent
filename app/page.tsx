export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "linear-gradient(to bottom right, #0f172a, #1e293b)",
        color: "#e5e7eb"
      }}
    >
      <div
        style={{
          padding: "2.5rem 3rem",
          borderRadius: "1.5rem",
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          boxShadow:
            "0 20px 25px -5px rgba(15, 23, 42, 0.7), 0 10px 10px -5px rgba(15, 23, 42, 0.6)",
          maxWidth: "560px",
          width: "100%",
          textAlign: "center"
        }}
      >
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            letterSpacing: "-0.04em"
          }}
        >
          Минимальное Next.js приложение
        </h1>
        <p
          style={{
            fontSize: "1.05rem",
            color: "#9ca3af",
            marginBottom: "1.75rem"
          }}
        >
          Проект успешно инициализирован. Откройте этот файл{" "}
          <code style={{ background: "#020617", padding: "0.15rem 0.4rem", borderRadius: "0.35rem" }}>
            app/page.tsx
          </code>{" "}
          и измените содержимое под свои задачи.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            fontSize: "0.9rem",
            color: "#9ca3af"
          }}
        >
          <div>Команда разработки: <code>npm run dev</code></div>
          <div>Откройте в браузере: <code>http://localhost:3000</code></div>
        </div>
      </div>
    </main>
  );
}



