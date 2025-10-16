import { CacheDriver, DriverOptions } from '../types/driver';
import { StoreConfig } from '../types/config';
import { CacheConfigurationError } from '../types/errors';
import { MemoryDriver } from '../drivers/memory.driver';
import { RedisDriver } from '../drivers/redis.driver';
import { MemcachedDriver } from '../drivers/memcached.driver';

export interface DriverFactory {
  createDriver(config: StoreConfig, options: DriverOptions): CacheDriver;
}

export class CacheDriverFactory implements DriverFactory {
  createDriver(config: StoreConfig, options: DriverOptions): CacheDriver {
    switch (config.driver) {
      case 'memory':
        return new MemoryDriver(config.connection, options);
      case 'redis':
        return new RedisDriver(config.connection, options);
      case 'memcached':
        return new MemcachedDriver(config.connection, options);
      default:
        throw new CacheConfigurationError(
          `Unknown driver type: ${(config as any).driver}`
        );
    }
  }
}
