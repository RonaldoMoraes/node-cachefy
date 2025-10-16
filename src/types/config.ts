/**
 * Configuration for Redis/Valkey cache store
 */
export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  username?: string;
  url?: string;
  keyPrefix?: string;
  connectTimeout?: number;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
}

/**
 * Configuration for Memcached cache store
 */
export interface MemcachedConfig {
  servers?: string | string[];
  options?: {
    maxKeySize?: number;
    maxExpiration?: number;
    maxValue?: number;
    poolSize?: number;
    algorithm?: string;
    reconnect?: number;
    timeout?: number;
    retries?: number;
    failures?: number;
    retry?: number;
    remove?: boolean;
    failOverServers?: string[];
    keyCompression?: boolean;
    idle?: number;
  };
}

/**
 * Configuration for in-memory cache store
 */
export interface MemoryConfig {
  maxSize?: number; // Maximum number of items
  maxMemory?: string; // Maximum memory usage (e.g., '100MB')
  cleanupInterval?: number; // Cleanup interval in seconds
}

/**
 * Base store configuration
 */
export interface BaseStoreConfig {
  driver: 'redis' | 'memcached' | 'memory';
  defaultTtl?: number; // Default TTL in seconds
  keyPrefix?: string;
  errorMode?: 'strict' | 'graceful';
  reconnect?: {
    maxRetries?: number;
    retryDelay?: number; // in milliseconds
    exponentialBackoff?: boolean;
  };
}

/**
 * Redis store configuration
 */
export interface RedisStoreConfig extends BaseStoreConfig {
  driver: 'redis';
  connection: RedisConfig;
}

/**
 * Memcached store configuration
 */
export interface MemcachedStoreConfig extends BaseStoreConfig {
  driver: 'memcached';
  connection: MemcachedConfig;
}

/**
 * Memory store configuration
 */
export interface MemoryStoreConfig extends BaseStoreConfig {
  driver: 'memory';
  connection: MemoryConfig;
}

/**
 * Union type for all store configurations
 */
export type StoreDriverType = 'redis' | 'memcached' | 'memory';

export type StoreConfig =
  | RedisStoreConfig
  | MemcachedStoreConfig
  | MemoryStoreConfig;

/**
 * Main cache configuration
 */
export interface CacheConfig<
  T extends Record<string, StoreConfig> = Record<string, StoreConfig>,
> {
  default: keyof T;
  stores: T;
  globalTtl?: number; // Global default TTL in seconds
  globalErrorMode?: 'strict' | 'graceful';
}

/**
 * Type helper to extract store names from config
 */
export type StoreNames<T extends CacheConfig> = keyof T['stores'];
