# Инструкция по настройке AI-провайдеров

## Настройка переменных окружения

Создайте файл `.env.local` в корне проекта (`C:\Work\referent\.env.local`) и добавьте необходимые API ключи.

### Вариант 1: YandexGPT (рекомендуется для России)

1. Зарегистрируйтесь на [Yandex Cloud](https://cloud.yandex.ru/)
2. Создайте каталог (folder) и получите его ID
3. Создайте сервисный аккаунт и получите API-ключ
4. Включите YandexGPT в вашем каталоге
5. Добавьте в `.env.local`:

```env
YANDEX_GPT_API_KEY=ваш-api-ключ-здесь
YANDEX_FOLDER_ID=ваш-folder-id-здесь
```

**Документация:** https://cloud.yandex.ru/docs/ai/llm/

### Вариант 2: OpenRouter (fallback)

1. Зарегистрируйтесь на [OpenRouter](https://openrouter.ai/)
2. Получите API ключ на странице [Keys](https://openrouter.ai/keys)
3. Добавьте в `.env.local`:

```env
OPENROUTER_API_KEY=ваш-api-ключ-здесь
```

**Примечание:** OpenRouter может быть недоступен в некоторых регионах.

### Вариант 3: Yandex Translate (для перевода)

1. Получите бесплатный API ключ на [Yandex Translate](https://translate.yandex.ru/developers/keys)
2. Добавьте в `.env.local`:

```env
YANDEX_TRANSLATE_API_KEY=ваш-api-ключ-здесь
```

## Пример файла .env.local

```env
# YandexGPT (основной AI-провайдер)
YANDEX_GPT_API_KEY=AQVNxxxxxxxxxxxxxxxxxxxxx
YANDEX_FOLDER_ID=b1gxxxxxxxxxxxxxxxxxxxxx

# OpenRouter (fallback, опционально)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx

# Yandex Translate (для функции перевода)
YANDEX_TRANSLATE_API_KEY=trn.1.1.xxxxxxxxxxxxxxxxxxxxx

# URL приложения (для OpenRouter)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Приоритет использования AI-провайдеров

1. **YandexGPT** - используется по умолчанию, если настроен
2. **OpenRouter** - используется как fallback, если YandexGPT недоступен

## Проверка настройки

После добавления ключей перезапустите dev-сервер:

```powershell
# Остановите текущий сервер (Ctrl+C), затем:
pnpm dev
```

Приложение автоматически определит доступные провайдеры и будет использовать их в порядке приоритета.

