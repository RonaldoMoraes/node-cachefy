import { CacheDriver, CacheStats } from './types/driver';
import { CacheConfig } from './types/config';
import { CacheConfigurationError } from './types/errors';
import { CacheDriverFactory } from './factories/driver.factory';
import { StoreManager } from './managers/store.manager';
import { CacheStoreProxy } from './core/store-proxy';

/**
 * Cache System
 * -----------
 * Provides a unified interface for caching operations across different storage backends.
 *
 * Features:
 * - Multiple storage backends (Redis, Memcached, Memory)
 * - Type-safe cache operations
 * - TTL support
 * - Bulk operations
 * - Counter operations
 *
 * Basic Usage:
 * ```typescript
 * // Initialize cache
 * await Cache.initialize({
 *   default: 'memory',
 *   stores: {
 *     memory: {
 *       driver: 'memory',
 *       connection: { maxSize: 1000 }
 *     }
 *   }
 * });
 *
 * // Basic operations
 * await Cache.set('key', value);
 * const value = await Cache.get('key');
 *
 * // Store selection
 * const redis = Cache.store('redis');
 * await redis.set('key', value);
 * ```
 */
export class Cache {
  private static defaultStore: string | null = null;
  private static storeManager: StoreManager | null = null;
  private static driverFactory: CacheDriverFactory = new CacheDriverFactory();

  /**
   * Initialize the cache system with configuration
   * @param config Cache configuration
   */
  static async initialize<T extends CacheConfig>(config: T): Promise<void> {
    this.defaultStore = String(config.default);
    this.storeManager = new StoreManager(config, this.driverFactory);

    // Initialize the default store immediately
    await this.getStoreInstance(this.defaultStore);
  }

  /**
   * Get a value from the default cache store
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  static async get<T = any>(key: string): Promise<T | null> {
    const store = await this.getDefaultStore();
    return store.get<T>(key);
  }

  /**
   * Set a value in the default cache store
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  static async set<T = any>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    const store = await this.getDefaultStore();
    return store.set(key, value, ttl);
  }

  /**
   * Delete a value from the default cache store
   * @param key Cache key
   * @returns True if the key was deleted, false if it didn't exist
   */
  static async delete(key: string): Promise<boolean> {
    const store = await this.getDefaultStore();
    return store.delete(key);
  }

  /**
   * Check if a key exists in the default cache store
   * @param key Cache key
   * @returns True if the key exists, false otherwise
   */
  static async exists(key: string): Promise<boolean> {
    const store = await this.getDefaultStore();
    return store.exists(key);
  }

  /**
   * Clear all entries from the default cache store
   */
  static async clear(): Promise<void> {
    const store = await this.getDefaultStore();
    return store.clear();
  }

  /**
   * Get multiple values from the default cache store
   * @param keys Array of cache keys
   * @returns Object with keys and their values (null for missing keys)
   */
  static async getMultiple<T = any>(
    keys: string[]
  ): Promise<Record<string, T | null>> {
    const store = await this.getDefaultStore();
    return store.getMultiple<T>(keys);
  }

  /**
   * Set multiple values in the default cache store
   * @param entries Object with key-value pairs
   * @param ttl Time to live in seconds (optional, applied to all entries)
   */
  static async setMultiple<T = any>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<void> {
    const store = await this.getDefaultStore();
    return store.setMultiple(entries, ttl);
  }

  /**
   * Delete multiple keys from the default cache store
   * @param keys Array of cache keys
   * @returns Number of keys that were deleted
   */
  static async deleteMultiple(keys: string[]): Promise<number> {
    const store = await this.getDefaultStore();
    return store.deleteMultiple(keys);
  }

  /**
   * Increment a numeric value in the default cache store
   * @param key Cache key
   * @param increment Amount to increment by (default: 1)
   * @returns The new value after increment
   */
  static async increment(key: string, increment?: number): Promise<number> {
    const store = await this.getDefaultStore();
    return store.increment(key, increment);
  }

  /**
   * Decrement a numeric value in the default cache store
   * @param key Cache key
   * @param decrement Amount to decrement by (default: 1)
   * @returns The new value after decrement
   */
  static async decrement(key: string, decrement?: number): Promise<number> {
    const store = await this.getDefaultStore();
    return store.decrement(key, decrement);
  }

  /**
   * Get statistics from the default cache store
   */
  static async getStats(): Promise<CacheStats> {
    const store = await this.getDefaultStore();
    return store.getStats();
  }

  /**
   * Access a specific cache store
   * @param name Store name from configuration
   * @returns Store-specific cache operations
   */
  static store<T extends CacheConfig>(
    name: keyof T['stores']
  ): CacheStoreProxy {
    if (!this.storeManager) {
      throw new CacheConfigurationError(
        'Cache not initialized. Call Cache.initialize() first.'
      );
    }
    return new CacheStoreProxy(String(name), this.storeManager);
  }

  /**
   * Disconnect all cache stores and cleanup resources
   */
  static async disconnect(): Promise<void> {
    if (this.storeManager) {
      await this.storeManager.disconnect();
      this.storeManager = null;
    }
    this.defaultStore = null;
  }

  /**
   * Get the default store driver instance
   */
  private static async getDefaultStore(): Promise<CacheDriver> {
    if (!this.defaultStore) {
      throw new CacheConfigurationError(
        'Cache not initialized. Call Cache.initialize() first.'
      );
    }

    return this.getStoreInstance(this.defaultStore);
  }

  /**
   * Get or create a store instance
   * @param storeName Store name from configuration
   * @returns Cache driver instance
   */
  private static async getStoreInstance(
    storeName: string
  ): Promise<CacheDriver> {
    if (!this.storeManager) {
      throw new CacheConfigurationError(
        'Cache not initialized. Call Cache.initialize() first.'
      );
    }

    return this.storeManager.getStore(storeName);
  }
}
