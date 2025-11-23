/**
 * Redis Client com fallback para memória
 * OWASP A06:2025 - Insecure Design
 */

import Redis from "ioredis";

let redis: Redis | null = null;
let useMemoryFallback = false;

// Fallback em memória (só para desenvolvimento/fallback)
interface MemoryStore {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
}

const memoryStore: MemoryStore = {};

// Cleanup de memória a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  Object.keys(memoryStore).forEach((key) => {
    if (memoryStore[key].expiresAt < now) {
      delete memoryStore[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Inicializa cliente Redis
 */
function initRedis(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PASSWORD;

  if (!redisUrl) {
    console.warn(
      "[Redis] REDIS_URL não configurado. Usando fallback em memória (NÃO usar em produção multi-instance)"
    );
    useMemoryFallback = true;
    return null;
  }

  try {
    // Suporta tanto URL completa quanto apenas password
    const config = redisUrl.startsWith("redis://")
      ? redisUrl
      : {
          host: "localhost",
          port: 6379,
          password: redisUrl,
          maxRetriesPerRequest: 3,
          retryStrategy(times: number) {
            if (times > 3) {
              console.error("[Redis] Max retries reached, using memory fallback");
              useMemoryFallback = true;
              return null;
            }
            return Math.min(times * 50, 2000);
          },
        };

    redis = new Redis(config);

    redis.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
      useMemoryFallback = true;
    });

    redis.on("connect", () => {
      console.info("[Redis] Connected successfully");
      useMemoryFallback = false;
    });

    return redis;
  } catch (error) {
    console.error("[Redis] Init error:", error);
    useMemoryFallback = true;
    return null;
  }
}

/**
 * GET com fallback
 */
export async function redisGet(key: string): Promise<string | null> {
  if (useMemoryFallback || !redis) {
    const entry = memoryStore[key];
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      delete memoryStore[key];
      return null;
    }
    return entry.value;
  }

  try {
    return await redis.get(key);
  } catch (error) {
    console.error("[Redis] GET error, falling back to memory:", error);
    useMemoryFallback = true;
    return memoryStore[key]?.value || null;
  }
}

/**
 * SET com fallback e TTL
 */
export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  if (useMemoryFallback || !redis) {
    memoryStore[key] = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    return;
  }

  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch (error) {
    console.error("[Redis] SET error, falling back to memory:", error);
    useMemoryFallback = true;
    memoryStore[key] = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
  }
}

/**
 * INCR com fallback
 */
export async function redisIncr(key: string): Promise<number> {
  if (useMemoryFallback || !redis) {
    const current = memoryStore[key];
    const newValue = current ? parseInt(current.value, 10) + 1 : 1;
    memoryStore[key] = {
      value: String(newValue),
      expiresAt: current?.expiresAt || Date.now() + 3600 * 1000,
    };
    return newValue;
  }

  try {
    return await redis.incr(key);
  } catch (error) {
    console.error("[Redis] INCR error, falling back to memory:", error);
    useMemoryFallback = true;
    const current = memoryStore[key];
    const newValue = current ? parseInt(current.value, 10) + 1 : 1;
    memoryStore[key] = {
      value: String(newValue),
      expiresAt: current?.expiresAt || Date.now() + 3600 * 1000,
    };
    return newValue;
  }
}

/**
 * EXPIRE com fallback
 */
export async function redisExpire(key: string, ttlSeconds: number): Promise<void> {
  if (useMemoryFallback || !redis) {
    if (memoryStore[key]) {
      memoryStore[key].expiresAt = Date.now() + ttlSeconds * 1000;
    }
    return;
  }

  try {
    await redis.expire(key, ttlSeconds);
  } catch (error) {
    console.error("[Redis] EXPIRE error, falling back to memory:", error);
    useMemoryFallback = true;
    if (memoryStore[key]) {
      memoryStore[key].expiresAt = Date.now() + ttlSeconds * 1000;
    }
  }
}

/**
 * DEL com fallback
 */
export async function redisDel(key: string): Promise<void> {
  if (useMemoryFallback || !redis) {
    delete memoryStore[key];
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error("[Redis] DEL error, falling back to memory:", error);
    useMemoryFallback = true;
    delete memoryStore[key];
  }
}

// Inicializar no startup
initRedis();

export { redis, useMemoryFallback };
