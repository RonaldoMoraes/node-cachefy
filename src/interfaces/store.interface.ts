import { CacheStats } from '../types/driver';

export interface CacheStore {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  setMultiple<T = any>(entries: Record<string, T>, ttl?: number): Promise<void>;
  deleteMultiple(keys: string[]): Promise<number>;
  increment(key: string, increment?: number): Promise<number>;
  decrement(key: string, decrement?: number): Promise<number>;
  getStats(): Promise<CacheStats>;
}
