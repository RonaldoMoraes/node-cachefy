import { CacheDriver, CacheStats, DriverOptions } from '../types/driver';
import { MemoryConfig } from '../types/config';
import { CacheConfigurationError } from '../types/errors';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number | null;
  createdAt: number;
  accessedAt: number;
}

/**
 * In-memory cache driver implementation
 */
export class MemoryDriver implements CacheDriver {
  private readonly store = new Map<string, CacheEntry>();
  private readonly config: MemoryConfig;
  private readonly options: DriverOptions;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config: MemoryConfig, options: DriverOptions) {
    this.config = config;
    this.options = {
      keyPrefix: options.keyPrefix ?? '',
      defaultTtl: options.defaultTtl ?? 3600,
      errorMode: options.errorMode ?? 'strict',
      reconnect: options.reconnect ?? undefined,
    };
  }

  async initialize(): Promise<void> {
    this.validateConfig();
    this.startCleanupTimer();
  }

  isReady(): boolean {
    return true; // Memory driver is always ready
  }

  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const entry = this.store.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      this.stats.misses++;
      return null;
    }

    // Update access time
    entry.accessedAt = Date.now();
    this.stats.hits++;

    return entry.value as T;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const effectiveTtl = ttl ?? this.options.defaultTtl;
    const now = Date.now();

    // Check if we're at capacity and need to evict
    if (
      this.config.maxSize &&
      this.store.size >= this.config.maxSize &&
      !this.store.has(fullKey)
    ) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt:
        effectiveTtl && effectiveTtl > 0 ? now + effectiveTtl * 1000 : null,
      createdAt: now,
      accessedAt: now,
    };

    this.store.set(fullKey, entry);
    this.stats.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const existed = this.store.has(fullKey);

    if (existed) {
      this.store.delete(fullKey);
      this.stats.deletes++;
    }

    return existed;
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const entry = this.store.get(fullKey);

    if (!entry) {
      return false;
    }

    // Check if entry is expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.resetStats();
  }

  async getMultiple<T = any>(
    keys: string[]
  ): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};

    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }

    return result;
  }

  async setMultiple<T = any>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, ttl);
    }
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    let deletedCount = 0;

    for (const key of keys) {
      const wasDeleted = await this.delete(key);
      if (wasDeleted) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async increment(key: string, increment: number = 1): Promise<number> {
    const currentValue = await this.get<number>(key);
    const numericValue = typeof currentValue === 'number' ? currentValue : 0;
    const newValue = numericValue + increment;

    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, decrement: number = 1): Promise<number> {
    return this.increment(key, -decrement);
  }

  async getStats(): Promise<CacheStats> {
    return {
      ...this.stats,
      keys: this.store.size,
      memoryUsage: this.getMemoryUsage(),
      connected: true,
    };
  }

  async disconnect(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async reconnect(): Promise<void> {
    // Memory driver doesn't need reconnection, but restart cleanup timer if needed
    if (!this.cleanupTimer) {
      this.startCleanupTimer();
    }
  }

  private getFullKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}${key}` : key;
  }

  private validateConfig(): void {
    if (this.config.maxSize !== undefined && this.config.maxSize <= 0) {
      throw new CacheConfigurationError(
        'maxSize must be greater than 0',
        'memory'
      );
    }

    if (
      this.config.cleanupInterval !== undefined &&
      this.config.cleanupInterval <= 0
    ) {
      throw new CacheConfigurationError(
        'cleanupInterval must be greater than 0',
        'memory'
      );
    }
  }

  private startCleanupTimer(): void {
    const interval = (this.config.cleanupInterval ?? 60) * 1000; // Convert to milliseconds

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);

    // Don't keep the process alive just for the cleanup timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestAccessTime = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.accessedAt < oldestAccessTime) {
        oldestAccessTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  private getMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;

    for (const [key, entry] of this.store.entries()) {
      size += key.length * 2; // Rough string size in bytes
      size += JSON.stringify(entry.value).length * 2; // Rough value size
      size += 64; // Rough overhead for entry metadata
    }

    return size;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }
}
