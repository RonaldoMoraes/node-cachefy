import { ErrorMode } from './errors';

/**
 * Cache driver interface that all drivers must implement
 */
export interface CacheDriver {
  /**
   * Initialize the driver with configuration
   */
  initialize(): Promise<void>;

  /**
   * Check if the driver is connected and ready
   */
  isReady(): boolean;

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache
   * @param key Cache key
   * @returns True if the key was deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns True if the key exists, false otherwise
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get multiple values from cache
   * @param keys Array of cache keys
   * @returns Object with keys and their values (null for missing keys)
   */
  getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;

  /**
   * Set multiple values in cache
   * @param entries Object with key-value pairs
   * @param ttl Time to live in seconds (optional, applied to all entries)
   */
  setMultiple<T = any>(entries: Record<string, T>, ttl?: number): Promise<void>;

  /**
   * Delete multiple keys from cache
   * @param keys Array of cache keys
   * @returns Number of keys that were deleted
   */
  deleteMultiple(keys: string[]): Promise<number>;

  /**
   * Increment a numeric value in cache
   * @param key Cache key
   * @param increment Amount to increment by (default: 1)
   * @returns The new value after increment
   */
  increment(key: string, increment?: number): Promise<number>;

  /**
   * Decrement a numeric value in cache
   * @param key Cache key
   * @param decrement Amount to decrement by (default: 1)
   * @returns The new value after decrement
   */
  decrement(key: string, decrement?: number): Promise<number>;

  /**
   * Get statistics about the cache driver
   */
  getStats(): Promise<CacheStats>;

  /**
   * Close the connection and cleanup resources
   */
  disconnect(): Promise<void>;

  /**
   * Reconnect to the cache store
   */
  reconnect(): Promise<void>;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits?: number;
  misses?: number;
  keys?: number;
  memoryUsage?: number;
  uptime?: number;
  connected: boolean;
  [key: string]: any; // Allow driver-specific stats
}

/**
 * Driver configuration options
 */
export interface DriverOptions {
  keyPrefix: string | undefined;
  defaultTtl: number | undefined;
  errorMode: ErrorMode | undefined;
  reconnect: {
    maxRetries: number | undefined;
    retryDelay: number | undefined;
    exponentialBackoff: boolean | undefined;
  } | undefined;
}