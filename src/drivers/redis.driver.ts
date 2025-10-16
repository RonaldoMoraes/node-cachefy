import {
  createClient,
  RedisClientType,
  RedisDefaultModules,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from 'redis';
import { CacheDriver, CacheStats, DriverOptions } from '../types/driver';
import { RedisConfig } from '../types/config';
import { CacheConnectionError, CacheDriverError } from '../types/errors';
import { serialize, deserialize } from '../utils/serializer';

type RedisClient = RedisClientType<
  RedisDefaultModules & RedisModules,
  RedisFunctions,
  RedisScripts
>;

/**
 * Redis cache driver implementation
 */
export class RedisDriver implements CacheDriver {
  private client: RedisClient | null = null;
  private readonly config: RedisConfig;
  private readonly options: DriverOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;

  constructor(config: RedisConfig, options: DriverOptions) {
    this.config = config;
    this.options = {
      keyPrefix: options.keyPrefix ?? '',
      defaultTtl: options.defaultTtl ?? 3600,
      errorMode: options.errorMode ?? 'strict',
      reconnect: options.reconnect ?? {
        maxRetries: 5,
        retryDelay: 1000,
        exponentialBackoff: true,
      },
    };
  }

  async initialize(): Promise<void> {
    try {
      this.client = this.createClient();

      // Set up event listeners
      this.setupEventListeners();

      // Connect to Redis
      await this.client.connect();

      this.reconnectAttempts = 0;
    } catch (error) {
      throw new CacheConnectionError(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'redis'
      );
    }
  }

  isReady(): boolean {
    return this.client?.isReady ?? false;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client!.get(fullKey);

      if (result === null) {
        return null;
      }

      return deserialize<T>(result, 'redis');
    } catch (error) {
      throw new CacheDriverError(
        `Failed to get key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'get'
      );
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = serialize(value, 'redis');
      const effectiveTtl = ttl ?? this.options.defaultTtl;

      if (effectiveTtl && effectiveTtl > 0) {
        await this.client!.setEx(fullKey, effectiveTtl, serializedValue);
      } else {
        await this.client!.set(fullKey, serializedValue);
      }
    } catch (error) {
      throw new CacheDriverError(
        `Failed to set key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'set'
      );
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client!.del(fullKey);
      return result > 0;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to delete key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'delete'
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client!.exists(fullKey);
      return result > 0;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to check existence of key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'exists'
      );
    }
  }

  async clear(): Promise<void> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      await this.client!.flushDb();
    } catch (error) {
      throw new CacheDriverError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'clear'
      );
    }
  }

  async getMultiple<T = any>(
    keys: string[]
  ): Promise<Record<string, T | null>> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const results = await this.client!.mGet(fullKeys);

      const response: Record<string, T | null> = {};

      for (let i = 0; i < keys.length; i++) {
        const result = results[i];
        response[keys[i]] = result ? deserialize<T>(result, 'redis') : null;
      }

      return response;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to get multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'getMultiple'
      );
    }
  }

  async setMultiple<T = any>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<void> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const pipeline = this.client!.multi();
      const effectiveTtl = ttl ?? this.options.defaultTtl;

      for (const [key, value] of Object.entries(entries)) {
        const fullKey = this.getFullKey(key);
        const serializedValue = serialize(value, 'redis');

        if (effectiveTtl && effectiveTtl > 0) {
          pipeline.setEx(fullKey, effectiveTtl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }

      await pipeline.exec();
    } catch (error) {
      throw new CacheDriverError(
        `Failed to set multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'setMultiple'
      );
    }
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      return await this.client!.del(fullKeys);
    } catch (error) {
      throw new CacheDriverError(
        `Failed to delete multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'deleteMultiple'
      );
    }
  }

  async increment(key: string, increment: number = 1): Promise<number> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKey = this.getFullKey(key);
      return await this.client!.incrBy(fullKey, increment);
    } catch (error) {
      throw new CacheDriverError(
        `Failed to increment key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'increment'
      );
    }
  }

  async decrement(key: string, decrement: number = 1): Promise<number> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const fullKey = this.getFullKey(key);
      return await this.client!.decrBy(fullKey, decrement);
    } catch (error) {
      throw new CacheDriverError(
        `Failed to decrement key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'decrement'
      );
    }
  }

  async getStats(): Promise<CacheStats> {
    if (!this.isReady()) {
      await this.ensureConnection();
    }

    try {
      const info = await this.client!.info('stats');
      const lines = info.split('\r\n');
      const stats: any = { connected: this.isReady() };

      for (const line of lines) {
        const [key, value] = line.split(':');
        if (key && value) {
          const numValue = Number(value);
          stats[key] = isNaN(numValue) ? value : numValue;
        }
      }

      return {
        hits: stats.keyspace_hits || 0,
        misses: stats.keyspace_misses || 0,
        keys: stats.db0 ? parseInt(stats.db0.split(',')[0].split('=')[1]) : 0,
        memoryUsage: stats.used_memory || 0,
        uptime: stats.uptime_in_seconds || 0,
        connected: this.isReady(),
        ...stats,
      };
    } catch (error) {
      throw new CacheDriverError(
        `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'redis',
        'getStats'
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.client.isOpen) {
      await this.client.disconnect();
    }

    this.client = null;
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.initialize();
  }

  private createClient(): RedisClient {
    const clientOptions: any = {
      socket: {
        host: this.config.host || 'localhost',
        port: this.config.port || 6379,
        connectTimeout: this.config.connectTimeout || 5000,
      },
    };

    if (this.config.password) {
      clientOptions.password = this.config.password;
    }

    if (this.config.username) {
      clientOptions.username = this.config.username;
    }

    if (this.config.database !== undefined) {
      clientOptions.database = this.config.database;
    }

    if (this.config.url) {
      return createClient({ url: this.config.url });
    }

    return createClient(clientOptions);
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('error', err => {
      console.error('Redis connection error:', err);
      this.handleConnectionError();
    });

    this.client.on('connect', () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.client.on('end', () => {
      this.handleConnectionError();
    });
  }

  private handleConnectionError(): void {
    if (this.isConnecting || !this.options.reconnect) {
      return;
    }

    const maxRetries = this.options.reconnect.maxRetries ?? 5;
    if (this.reconnectAttempts >= maxRetries) {
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const baseDelay = this.options.reconnect?.retryDelay ?? 1000;
    const exponentialBackoff =
      this.options.reconnect?.exponentialBackoff ?? true;

    let delay = baseDelay;
    if (exponentialBackoff) {
      delay = baseDelay * Math.pow(2, Math.min(this.reconnectAttempts, 6));
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      try {
        this.isConnecting = true;
        await this.reconnect();
        this.isConnecting = false;
      } catch (error) {
        this.isConnecting = false;
        console.error('Failed to reconnect to Redis:', error);
        this.handleConnectionError();
      }
    }, delay);
  }

  private async ensureConnection(): Promise<void> {
    if (this.isReady()) {
      return;
    }

    if (!this.client) {
      throw new CacheConnectionError('Redis client not initialized', 'redis');
    }

    if (!this.client.isOpen) {
      try {
        await this.client.connect();
      } catch (error) {
        throw new CacheConnectionError(
          `Failed to reconnect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'redis'
        );
      }
    }
  }

  private getFullKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}${key}` : key;
  }
}
