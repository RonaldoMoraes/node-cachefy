import { CacheStats } from '../types/driver';
import { CacheStore } from '../interfaces/store.interface';
import { StoreProvider } from '../interfaces/store-provider.interface';

/**
 * Store-specific cache operations proxy
 * Provides access to specific cache store operations while maintaining connection management
 */
export class CacheStoreProxy implements CacheStore {
  constructor(
    private readonly storeName: string,
    private readonly storeProvider: StoreProvider
  ) {}

  async get<T = any>(key: string): Promise<T | null> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.get<T>(key);
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.set(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.exists(key);
  }

  async clear(): Promise<void> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.clear();
  }

  async getMultiple<T = any>(
    keys: string[]
  ): Promise<Record<string, T | null>> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.getMultiple<T>(keys);
  }

  async setMultiple<T = any>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<void> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.setMultiple(entries, ttl);
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.deleteMultiple(keys);
  }

  async increment(key: string, increment?: number): Promise<number> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.increment(key, increment);
  }

  async decrement(key: string, decrement?: number): Promise<number> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.decrement(key, decrement);
  }

  async getStats(): Promise<CacheStats> {
    const store = await this.storeProvider.getStore(this.storeName);
    return store.getStats();
  }
}
