import Redis from 'ioredis';
import { config } from '../config';

let redis: Redis | null = null;

const inflightCacheRequests = new Map<string, Promise<any>>();

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
      retryStrategy: (times) => (times > 1 ? null : 100),
    });
    redis.on('error', (err) => {
      console.error('[Redis] connection error:', err.message);
    });
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function cacheGet<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
  const client = getRedis();
  try {
    const cached = await client.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis miss or parse error — fall through to fetchFn
  }

  const inflight = inflightCacheRequests.get(key);
  if (inflight) return inflight as Promise<T>;

  const fetchPromise = fetchFn().then(async (result) => {
    try {
      await client.set(key, JSON.stringify(result), 'EX', ttl);
    } catch {
      // Redis write failure — non-critical, serve from DB
    }
    return result;
  }).finally(() => {
    inflightCacheRequests.delete(key);
  });

  inflightCacheRequests.set(key, fetchPromise);
  return fetchPromise;
}

export async function cacheInvalidate(key: string): Promise<void> {
  const client = getRedis();
  try {
    await client.del(key);
  } catch {
    // Non-critical
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const client = getRedis();
  try {
    const stream = client.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (batch: string[]) => keys.push(...batch));
      stream.on('end', () => resolve());
      stream.on('error', (err: Error) => reject(err));
    });
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // Non-critical
  }
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const client = getRedis();
  try {
    const exists = await client.exists(`blacklist:${jti}`);
    return exists === 1;
  } catch {
    return true;
  }
}

export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  try {
    await client.set(`blacklist:${jti}`, '1', 'EX', ttlSeconds);
  } catch {
    // Non-critical
  }
}

async function gracefulShutdown() {
  await disconnectRedis();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
