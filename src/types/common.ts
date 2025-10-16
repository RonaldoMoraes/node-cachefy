import { CacheConfig } from './config';

export type CacheKey = string;
export type TTLSeconds = number;
export type StoreName<T extends CacheConfig = CacheConfig> = keyof T['stores'];
export type CacheValue<T = any> = T | null;
export type BatchResult<T> = Record<CacheKey, CacheValue<T>>;

export interface CacheResult<T> {
  value: CacheValue<T>;
  found: boolean;
  ttl?: TTLSeconds;
}
