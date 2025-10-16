import { StoreConfig, StoreDriverType } from './config';

export function isValidDriverType(type: string): type is StoreDriverType {
  return ['redis', 'memcached', 'memory'].includes(type);
}

export function isStoreConfig(config: unknown): config is StoreConfig {
  if (!config || typeof config !== 'object') return false;

  const store = config as Partial<StoreConfig>;
  return (
    typeof store.driver === 'string' &&
    isValidDriverType(store.driver) &&
    typeof store.connection === 'object' &&
    store.connection !== null
  );
}
