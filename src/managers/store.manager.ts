import { CacheDriver } from '../types/driver';
import { CacheConfig, StoreConfig } from '../types/config';
import { CacheConfigurationError, CacheError } from '../types/errors';
import { DriverFactory } from '../factories/driver.factory';
import { StoreProvider } from '../interfaces/store-provider.interface';

interface StoreInstance {
  driver: CacheDriver;
  config: StoreConfig;
  initialized: boolean;
}

export class StoreManager implements StoreProvider {
  private stores: Map<string, StoreInstance> = new Map();

  constructor(
    private config: CacheConfig,
    private driverFactory: DriverFactory
  ) {}

  async getStore(storeName: string): Promise<CacheDriver> {
    const storeConfig = this.config.stores[storeName];
    if (!storeConfig) {
      throw new CacheConfigurationError(
        `Store '${storeName}' not found in configuration.`
      );
    }

    let storeInstance = this.stores.get(storeName);

    if (!storeInstance) {
      const driver = this.createDriver(storeConfig, storeName);
      storeInstance = {
        driver,
        config: storeConfig,
        initialized: false,
      };
      this.stores.set(storeName, storeInstance);
    }

    if (!storeInstance.initialized) {
      await this.initializeStore(storeInstance, storeName);
    }

    return storeInstance.driver;
  }

  async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const storeInstance of this.stores.values()) {
      if (storeInstance.initialized) {
        disconnectPromises.push(storeInstance.driver.disconnect());
      }
    }

    await Promise.all(disconnectPromises);
    this.stores.clear();
  }

  private createDriver(config: StoreConfig, storeName: string): CacheDriver {
    try {
      return this.driverFactory.createDriver(config, {
        keyPrefix: config.keyPrefix ?? undefined,
        defaultTtl: config.defaultTtl ?? this.config?.globalTtl ?? 3600,
        errorMode: config.errorMode ?? this.config?.globalErrorMode ?? 'strict',
        reconnect: config.reconnect
          ? {
              maxRetries: config.reconnect.maxRetries ?? undefined,
              retryDelay: config.reconnect.retryDelay ?? undefined,
              exponentialBackoff:
                config.reconnect.exponentialBackoff ?? undefined,
            }
          : undefined,
      });
    } catch (error) {
      throw new CacheConfigurationError(
        `Failed to create driver for store '${storeName}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async initializeStore(
    storeInstance: StoreInstance,
    storeName: string
  ): Promise<void> {
    try {
      await storeInstance.driver.initialize();
      storeInstance.initialized = true;
    } catch (error) {
      throw new CacheError(
        `Failed to initialize store '${storeName}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'INITIALIZATION_ERROR',
        storeName
      );
    }
  }
}
