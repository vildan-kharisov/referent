# API Документация

## Базовый URL

```
http://localhost:3000/api/analyze
```

## Endpoint

### POST /api/analyze

Анализ англоязычной статьи с использованием AI.

#### Запрос

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://example.com/article",
  "mode": "about"
}
```

**Параметры:**
- `url` (string, обязательный) — URL статьи для анализа
- `mode` (string, опциональный) — режим обработки:
  - `"parse"` — парсинг статьи (извлечение метаданных)
  - `"about"` — краткое описание статьи
  - `"thesis"` — ключевые тезисы
  - `"telegram"` — пост для Telegram
  - `"translate"` — перевод статьи
  - `null` — только парсинг

#### Ответы

##### Успешный ответ (200 OK)

**Режим "parse":**
```json
{
  "date": "2024-01-15T10:30:00Z",
  "title": "Article Title",
  "content": "Full article content..."
}
```

**Режим "about":**
```json
{
  "summary": "Краткое описание статьи на русском языке (2-3 предложения)...",
  "original": {
    "date": "2024-01-15T10:30:00Z",
    "title": "Article Title",
    "content": "Full article content..."
  }
}
```

**Режим "thesis":**
```json
{
  "thesis": [
    "Первый ключевой тезис статьи",
    "Второй ключевой тезис",
    "Третий ключевой тезис"
  ],
  "thesisText": "Оригинальный текст от AI с форматированием",
  "original": {
    "date": "2024-01-15T10:30:00Z",
    "title": "Article Title",
    "content": "Full article content..."
  }
}
```

**Режим "telegram":**
```json
{
  "telegramPost": "🚀 Заголовок поста\n\nОсновной текст поста с ключевыми мыслями...\n\n📖 Читать полностью: https://example.com/article",
  "original": {
    "date": "2024-01-15T10:30:00Z",
    "title": "Article Title",
    "content": "Full article content...",
    "url": "https://example.com/article"
  }
}
```

**Режим "translate":**
```json
{
  "translated": "Переведенный текст статьи на русском языке...",
  "original": {
    "date": "2024-01-15T10:30:00Z",
    "title": "Article Title",
    "content": "Full article content..."
  }
}
```

##### Ошибки

**400 Bad Request:**
```json
{
  "error": "Поле `url` обязательно и должно быть строкой."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Не удалось сгенерировать описание статьи.\n\nПроверьте настройку AI-провайдера:\n1. Убедитесь, что в .env.local добавлены YANDEX_GPT_API_KEY и YANDEX_FOLDER_ID\n2. Проверьте корректность ключей\n3. Убедитесь, что YandexGPT включен в вашем каталоге"
}
```

**502 Bad Gateway:**
```json
{
  "error": "Не удалось выполнить запрос к указанному URL. Проверьте корректность адреса и доступность сайта."
}
```

## Примеры использования

### cURL

```bash
# Парсинг статьи
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article", "mode": "parse"}'

# Краткое описание
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article", "mode": "about"}'

# Тезисы
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article", "mode": "thesis"}'

# Пост для Telegram
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article", "mode": "telegram"}'

# Перевод
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article", "mode": "translate"}'
```

### JavaScript/TypeScript

```typescript
// Парсинг статьи
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com/article',
    mode: 'parse'
  })
});

const data = await response.json();
console.log(data);
```

### PowerShell

```powershell
# Парсинг статьи
$body = @{
    url = "https://example.com/article"
    mode = "parse"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/analyze" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## Кэширование

Результаты AI-обработки кэшируются на 1 час по комбинации URL и режима. Это означает:
- Первый запрос к API выполнит полную обработку
- Последующие запросы с теми же параметрами вернут закэшированный результат
- Кэш автоматически очищается через 1 час

## Ограничения

- Максимальная длина статьи для обработки: ~50,000 символов (автоматическое разбиение на части)
- Время обработки зависит от длины статьи и доступности AI-провайдера
- Рекомендуется использовать HTTPS для продакшена

## Поддержка

При возникновении проблем:
1. Проверьте настройку API ключей в `.env.local`
2. Убедитесь, что URL статьи доступен
3. Проверьте логи сервера для детальной информации об ошибках

