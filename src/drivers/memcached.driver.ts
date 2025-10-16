import Memcached from 'memcached';
import { CacheDriver, CacheStats, DriverOptions } from '../types/driver';
import { MemcachedConfig } from '../types/config';
import { CacheConnectionError, CacheDriverError } from '../types/errors';
import { serialize, deserialize } from '../utils/serializer';

/**
 * Memcached cache driver implementation
 */
export class MemcachedDriver implements CacheDriver {
  private client: Memcached | null = null;
  private readonly config: MemcachedConfig;
  private readonly options: DriverOptions;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  constructor(config: MemcachedConfig, options: DriverOptions) {
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
      const servers = this.config.servers || ['localhost:11211'];
      const options = this.config.options || {};

      this.client = new Memcached(servers, options);

      this.setupEventListeners();

      // Test connection
      await this.testConnection();

      this.isConnected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      throw new CacheConnectionError(
        `Failed to connect to Memcached: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'memcached'
      );
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.promisify<string>(callback => {
        this.client!.get(fullKey, callback);
      });

      if (result === undefined || result === null) {
        return null;
      }

      return deserialize<T>(result, 'memcached');
    } catch (error) {
      throw new CacheDriverError(
        `Failed to get key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'get'
      );
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = serialize(value, 'memcached');
      const effectiveTtl = ttl ?? this.options.defaultTtl;

      await this.promisify<boolean>(callback => {
        this.client!.set(fullKey, serializedValue, effectiveTtl ?? 0, callback);
      });
    } catch (error) {
      throw new CacheDriverError(
        `Failed to set key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'set'
      );
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.promisify<boolean>(callback => {
        this.client!.del(fullKey, callback);
      });

      return result === true;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to delete key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'delete'
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    // Memcached doesn't have a direct exists method, so we use get
    try {
      const result = await this.get(key);
      return result !== null;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to check existence of key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'exists'
      );
    }
  }

  async clear(): Promise<void> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      await this.promisify<boolean[]>(callback => {
        this.client!.flush(callback);
      });
    } catch (error) {
      throw new CacheDriverError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'clear'
      );
    }
  }

  async getMultiple<T = any>(
    keys: string[]
  ): Promise<Record<string, T | null>> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const results = await this.promisify<Record<string, string>>(callback => {
        this.client!.getMulti(fullKeys, callback);
      });

      const response: Record<string, T | null> = {};

      for (const key of keys) {
        const fullKey = this.getFullKey(key);
        const result = results[fullKey];
        response[key] = result ? deserialize<T>(result, 'memcached') : null;
      }

      return response;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to get multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'getMultiple'
      );
    }
  }

  async setMultiple<T = any>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<void> {
    // Memcached doesn't have a native setMultiple, so we'll use parallel sets
    const promises = Object.entries(entries).map(([key, value]) =>
      this.set(key, value, ttl)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      throw new CacheDriverError(
        `Failed to set multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'setMultiple'
      );
    }
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    // Memcached doesn't have a native deleteMultiple, so we'll use parallel deletes
    const promises = keys.map(key => this.delete(key));

    try {
      const results = await Promise.all(promises);
      return results.filter(result => result === true).length;
    } catch (error) {
      throw new CacheDriverError(
        `Failed to delete multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'deleteMultiple'
      );
    }
  }

  async increment(key: string, increment: number = 1): Promise<number> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const fullKey = this.getFullKey(key);

      // First try to increment
      try {
        const result = await this.promisify<number | boolean>(callback => {
          this.client!.incr(fullKey, increment, callback);
        });
        return typeof result === 'number' ? result : increment;
      } catch (incrError) {
        // If key doesn't exist, set it to the increment value
        try {
          await this.set(key, increment);
          return increment;
        } catch (setError) {
          // Log the error and rethrow the original increment error
          console.error(
            'Failed to set default value after increment failure:',
            setError
          );
          throw incrError;
        }
      }
    } catch (error) {
      throw new CacheDriverError(
        `Failed to increment key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'increment'
      );
    }
  }

  async decrement(key: string, decrement: number = 1): Promise<number> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const fullKey = this.getFullKey(key);

      // First try to decrement
      try {
        const result = await this.promisify<number | boolean>(callback => {
          this.client!.decr(fullKey, decrement, callback);
        });
        return typeof result === 'number' ? result : -decrement;
      } catch (decrError) {
        // If key doesn't exist, set it to negative decrement value
        try {
          const newValue = -decrement;
          await this.set(key, newValue);
          return newValue;
        } catch (setError) {
          // Log the error and rethrow the original decrement error
          console.error(
            'Failed to set default value after decrement failure:',
            setError
          );
          throw decrError;
        }
      }
    } catch (error) {
      throw new CacheDriverError(
        `Failed to decrement key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'decrement'
      );
    }
  }

  async getStats(): Promise<CacheStats> {
    if (!this.isReady()) {
      throw new CacheConnectionError('Memcached client not ready', 'memcached');
    }

    try {
      const stats = await this.promisify<Record<string, any>>(callback => {
        this.client!.stats(callback);
      });

      // Parse stats from all servers
      let totalHits = 0;
      let totalMisses = 0;
      let totalKeys = 0;
      let totalMemoryUsage = 0;
      let uptime = 0;

      for (const serverStats of Object.values(stats)) {
        if (typeof serverStats === 'object' && serverStats !== null) {
          totalHits += parseInt(serverStats.get_hits) || 0;
          totalMisses += parseInt(serverStats.get_misses) || 0;
          totalKeys += parseInt(serverStats.curr_items) || 0;
          totalMemoryUsage += parseInt(serverStats.bytes) || 0;
          uptime = Math.max(uptime, parseInt(serverStats.uptime) || 0);
        }
      }

      return {
        hits: totalHits,
        misses: totalMisses,
        keys: totalKeys,
        memoryUsage: totalMemoryUsage,
        uptime,
        connected: this.isReady(),
        rawStats: stats,
      };
    } catch (error) {
      throw new CacheDriverError(
        `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'memcached',
        'getStats'
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.end();
      this.client = null;
    }

    this.isConnected = false;
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.initialize();
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('failure', details => {
      console.error('Memcached server failure:', details);
      this.isConnected = false;
      this.handleConnectionError();
    });

    this.client.on('reconnecting', details => {
      console.warn('Memcached reconnecting:', details);
    });

    this.client.on('reconnect', details => {
      console.warn('Memcached reconnected:', details);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.client.on('remove', details => {
      console.warn('Memcached server removed:', details);
    });
  }

  private handleConnectionError(): void {
    if (!this.options.reconnect) {
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
        await this.reconnect();
      } catch (error) {
        console.error('Failed to reconnect to Memcached:', error);
        this.handleConnectionError();
      }
    }, delay);
  }

  private async testConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Memcached client not initialized'));
        return;
      }

      // Test with a simple stats call
      this.client.stats(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private promisify<T>(
    operation: (callback: (err: Error | null, result?: T) => void) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      operation((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result!);
        }
      });
    });
  }

  private getFullKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}${key}` : key;
  }
}
