/**
 * Простое in-memory кэширование для результатов AI
 * В продакшене можно заменить на Redis или другой внешний кэш
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// In-memory кэш (в продакшене лучше использовать Redis)
const cache = new Map<string, CacheEntry>();

// Время жизни кэша по умолчанию (1 час)
const DEFAULT_TTL = 60 * 60 * 1000; // 1 час в миллисекундах

/**
 * Генерирует ключ кэша на основе URL и режима
 */
function generateCacheKey(url: string, mode: string): string {
  return `analyze:${mode}:${url}`;
}

/**
 * Получает значение из кэша
 */
export function getCache(url: string, mode: string): any | null {
  const key = generateCacheKey(url, mode);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Проверяем, не истек ли кэш
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Сохраняет значение в кэш
 */
export function setCache(url: string, mode: string, data: any, ttl: number = DEFAULT_TTL): void {
  const key = generateCacheKey(url, mode);
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl
  };

  cache.set(key, entry);
}

/**
 * Очищает кэш для конкретного URL и режима
 */
export function clearCache(url: string, mode: string): void {
  const key = generateCacheKey(url, mode);
  cache.delete(key);
}

/**
 * Очищает весь кэш
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Получает статистику кэша
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

/**
 * Очищает устаревшие записи из кэша
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}

// Периодическая очистка устаревших записей (каждые 10 минут)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredCache, 10 * 60 * 1000);
}

