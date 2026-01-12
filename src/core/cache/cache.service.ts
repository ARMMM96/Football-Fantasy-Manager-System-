import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    this.redis = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('✅Redis cache connected successfully!', 'CacheService');
    });

    this.redis.on('error', (err) => {
      this.logger.error(`❌ Redis connection error: ${err.message}`, err.stack, 'CacheService');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('🔌 Redis cache disconnected', 'CacheService');
  }

  /**
   * Set a value in the cache with optional TTL (time to live)
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttl Time to live in seconds (default: 300 = 5 minutes)
   */
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.setex(key, ttl, serialized);
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`🛑Error parsing cached value for key ${key}`, error.stack, 'CacheService');
      return null;
    }
  }

  /**
   * Delete a specific key from cache
   * @param key Cache key
   * @returns true if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern String pattern to match (supports wildcards with *)
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    const result = await this.redis.del(...keys);
    return result;
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns true if exists
   */
  async has(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Clear all cache entries (use with caution!)
   */
  async clear(): Promise<void> {
    await this.redis.flushdb();
    this.logger.log('🧹🧹 Cache cleared successfully', 'CacheService');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ keys: number; memory: string }> {
    const dbSize = await this.redis.dbsize();
    const info = await this.redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

    return {
      keys: dbSize,
      memory,
    };
  }

  /**
   * Get or set pattern - fetches from cache or executes function and caches result
   * @param key Cache key
   * @param factory Function to execute if cache miss
   * @param ttl Time to live in seconds
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl: number = 300,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment a numeric value in cache
   * @param key Cache key
   * @param amount Amount to increment by (default: 1)
   * @returns New value after increment
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    return await this.redis.incrby(key, amount);
  }

  /**
   * Decrement a numeric value in cache
   * @param key Cache key
   * @param amount Amount to decrement by (default: 1)
   * @returns New value after decrement
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    return await this.redis.decrby(key, amount);
  }

  /**
   * Set expiration time for a key
   * @param key Cache key
   * @param ttl Time to live in seconds
   * @returns true if expiration was set
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.redis.expire(key, ttl);
    return result === 1;
  }

  /**
   * Get remaining TTL for a key
   * @param key Cache key
   * @returns TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }
}
