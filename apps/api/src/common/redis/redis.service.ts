import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    const password = configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis(redisUrl, {
      password: password || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => this.logger.log('Redis connection established'));
    this.client.on('error', (err) => this.logger.error('Redis error:', err.message));
    this.client.on('close', () => this.logger.warn('Redis connection closed'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // Typed helpers (wraps raw ioredis for safer usage)
  // ─────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      this.logger.warn(`Failed to parse JSON from Redis key: ${key}`);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  /**
   * Returns all keys matching a pattern.
   * Use sparingly — SCAN-based for safety in production.
   */
  async keys(pattern: string): Promise<string[]> {
    const results: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      results.push(...keys);
    } while (cursor !== '0');
    return results;
  }
}
