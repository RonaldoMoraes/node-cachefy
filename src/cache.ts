import { CacheDriver, CacheStats, DriverOptions } from './types/driver';
import { CacheConfig, StoreConfig, StoreNames } from './types/config';
import { CacheConfigurationError, CacheError, ErrorMode } from './types/errors';
import { MemoryDriver } from './drivers/memory.driver';
import { RedisDriver } from './drivers/redis.driver';
import { MemcachedDriver } from './drivers/memcached.driver';

/**
 * Store instance wrapper with driver and configuration
 */
interface StoreInstance {
  driver: CacheDriver;
  config: StoreConfig;
  initialized: boolean;
}

/**
 * Main Cache class providing static access to cache operations
 */
export class Cache {
  private static config: CacheConfig | null = null;
  private static readonly stores: Map<string, StoreInstance> = new Map();
  private static defaultStore: string | null = null;

  /**
   * Initialize the cache system with configuration
   * @param config Cache configuration
   */
  static async initialize<T extends CacheConfig>(config: T): Promise<void> {
    this.config = config;
    this.defaultStore = String(config.default);
    this.stores.clear();

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
  static async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
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
  static async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const store = await this.getDefaultStore();
    return store.getMultiple<T>(keys);
  }

  /**
   * Set multiple values in the default cache store
   * @param entries Object with key-value pairs
   * @param ttl Time to live in seconds (optional, applied to all entries)
   */
  static async setMultiple<T = any>(entries: Record<string, T>, ttl?: number): Promise<void> {
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
  static store<T extends CacheConfig>(name: StoreNames<T>): CacheStoreProxy {
    return new CacheStoreProxy(String(name));
  }

  /**
   * Disconnect all cache stores and cleanup resources
   */
  static async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const storeInstance of this.stores.values()) {
      if (storeInstance.initialized) {
        disconnectPromises.push(storeInstance.driver.disconnect());
      }
    }

    await Promise.all(disconnectPromises);
    this.stores.clear();
    this.config = null;
    this.defaultStore = null;
  }

  /**
   * Get the default store driver instance
   */
  private static async getDefaultStore(): Promise<CacheDriver> {
    if (!this.defaultStore) {
      throw new CacheConfigurationError('Cache not initialized. Call Cache.initialize() first.');
    }

    return this.getStoreInstance(this.defaultStore);
  }

  /**
   * Get or create a store instance
   * @param storeName Store name from configuration
   * @returns Cache driver instance
   */
  private static async getStoreInstance(storeName: string): Promise<CacheDriver> {
    if (!this.config) {
      throw new CacheConfigurationError('Cache not initialized. Call Cache.initialize() first.');
    }

    const storeConfig = this.config.stores[storeName];
    if (!storeConfig) {
      throw new CacheConfigurationError(`Store '${storeName}' not found in configuration.`);
    }

    let storeInstance = this.stores.get(storeName);

    if (!storeInstance) {
      const driver = this.createDriver(storeConfig, storeName);
      storeInstance = {
        driver,
        config: storeConfig,
        initialized: false,
      };
      this.stores.set(storeName, storeInstance);
    }

    if (!storeInstance.initialized) {
      await this.initializeStore(storeInstance, storeName);
    }

    return storeInstance.driver;
  }

  /**
   * Create a driver instance based on configuration
   * @param config Store configuration
   * @param storeName Store name for error context
   * @returns Cache driver instance
   */
  private static createDriver(config: StoreConfig, storeName: string): CacheDriver {
    const options: DriverOptions = {
      keyPrefix: config.keyPrefix ?? undefined,
      defaultTtl: config.defaultTtl ?? this.config?.globalTtl ?? 3600,
      errorMode: config.errorMode ?? this.config?.globalErrorMode ?? 'strict' as ErrorMode,
      reconnect: config.reconnect ? {
        maxRetries: config.reconnect.maxRetries ?? undefined,
        retryDelay: config.reconnect.retryDelay ?? undefined,
        exponentialBackoff: config.reconnect.exponentialBackoff ?? undefined,
      } : undefined,
    };

    switch (config.driver) {
      case 'memory':
        return new MemoryDriver(config.connection, options);
      
      case 'redis':
        return new RedisDriver(config.connection, options);
      
      case 'memcached':
        return new MemcachedDriver(config.connection, options);
      
      default:
        throw new CacheConfigurationError(`Unknown driver type: ${(config as any).driver}`, storeName);
    }
  }

  /**
   * Initialize a store instance
   * @param storeInstance Store instance to initialize
   * @param storeName Store name for error context
   */
  private static async initializeStore(storeInstance: StoreInstance, storeName: string): Promise<void> {
    try {
      await storeInstance.driver.initialize();
      storeInstance.initialized = true;
    } catch (error) {
      throw new CacheError(
        `Failed to initialize store '${storeName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        storeName
      );
    }
  }
}

/**
 * Store-specific cache operations proxy
 */
class CacheStoreProxy {
  constructor(private readonly storeName: string) {}

  async get<T = any>(key: string): Promise<T | null> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.get<T>(key);
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.set(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.exists(key);
  }

  async clear(): Promise<void> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.clear();
  }

  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.getMultiple<T>(keys);
  }

  async setMultiple<T = any>(entries: Record<string, T>, ttl?: number): Promise<void> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.setMultiple(entries, ttl);
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.deleteMultiple(keys);
  }

  async increment(key: string, increment?: number): Promise<number> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.increment(key, increment);
  }

  async decrement(key: string, decrement?: number): Promise<number> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.decrement(key, decrement);
  }

  async getStats(): Promise<CacheStats> {
    const store = await Cache['getStoreInstance'](this.storeName);
    return store.getStats();
  }
}