import { CacheDriver, DriverOptions } from '../types/driver';
import {
  StoreConfig,
  MemoryConfig,
  RedisConfig,
  MemcachedConfig,
} from '../types/config';
import { CacheConfigurationError } from '../types/errors';
import { DriverRegistry } from '../registry/driver.registry';

export interface DriverFactory {
  createDriver(config: StoreConfig, options: DriverOptions): CacheDriver;
}

export class CacheDriverFactory implements DriverFactory {
  constructor() {
    // Register built-in drivers
    this.registerBuiltInDrivers();
  }

  createDriver(config: StoreConfig, options: DriverOptions): CacheDriver {
    try {
      const factory = DriverRegistry.getFactory(config.driver);
      return factory(config, options);
    } catch (error) {
      throw new CacheConfigurationError(
        `Failed to create driver '${config.driver}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private registerBuiltInDrivers(): void {
    // These will be imported and registered from their respective modules
    import('../drivers/memory.driver').then(({ MemoryDriver }) => {
      DriverRegistry.register(
        'memory',
        (config: StoreConfig, options: DriverOptions) =>
          new MemoryDriver(config.connection as MemoryConfig, options)
      );
    });

    import('../drivers/redis.driver').then(({ RedisDriver }) => {
      DriverRegistry.register(
        'redis',
        (config: StoreConfig, options: DriverOptions) =>
          new RedisDriver(config.connection as RedisConfig, options)
      );
    });

    import('../drivers/memcached.driver').then(({ MemcachedDriver }) => {
      DriverRegistry.register(
        'memcached',
        (config: StoreConfig, options: DriverOptions) =>
          new MemcachedDriver(config.connection as MemcachedConfig, options)
      );
    });
  }
}
