import { CacheDriver } from '../types/driver';

export interface StoreProvider {
  getStore(storeName: string): Promise<CacheDriver>;
}
