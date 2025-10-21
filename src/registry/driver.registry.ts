import { CacheDriver } from '../types/driver';
import { StoreConfig } from '../types/config';
import { CacheConfigurationError } from '../types/errors';

export type DriverFactory = (config: StoreConfig, options: any) => CacheDriver;

/**
 * Registry for cache drivers
 * Maintains a map of driver names to their factory functions
 */
export class DriverRegistry {
  private static drivers = new Map<string, DriverFactory>();

  /**
   * Register a new driver factory
   * @param name Unique name for the driver
   * @param factory Factory function to create driver instances
   */
  static register(name: string, factory: DriverFactory): void {
    if (this.drivers.has(name)) {
      throw new CacheConfigurationError(
        `Driver '${name}' is already registered. Use a different name.`
      );
    }
    this.drivers.set(name, factory);
  }

  /**
   * Get a driver factory by name
   * @param name Driver name
   * @returns Driver factory function
   */
  static getFactory(name: string): DriverFactory {
    const factory = this.drivers.get(name);
    if (!factory) {
      throw new CacheConfigurationError(
        `Driver '${name}' not found. Make sure to register the driver before using it.`
      );
    }
    return factory;
  }

  /**
   * Check if a driver is registered
   * @param name Driver name
   */
  static has(name: string): boolean {
    return this.drivers.has(name);
  }

  /**
   * Clear all registered drivers
   * Mainly used for testing
   */
  static clear(): void {
    this.drivers.clear();
  }
}
