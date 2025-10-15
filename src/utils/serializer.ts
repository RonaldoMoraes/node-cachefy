import { CacheSerializationError } from '../types/errors';

/**
 * Serialization utilities for cache values
 */
export class Serializer {
  /**
   * Serialize a value for storage
   * @param value Value to serialize
   * @param store Store name for error context
   * @returns Serialized string
   */
  static serialize(value: any, store?: string): string {
    try {
      // Handle primitives that don't need JSON serialization
      if (value === null || value === undefined) {
        return JSON.stringify(value);
      }

      if (typeof value === 'string') {
        return JSON.stringify(value);
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return JSON.stringify(value);
      }

      // Handle objects, arrays, etc.
      return JSON.stringify(value);
    } catch (error) {
      throw new CacheSerializationError(
        `Failed to serialize value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        store,
        'serialize'
      );
    }
  }

  /**
   * Deserialize a stored value
   * @param data Serialized data string
   * @param store Store name for error context
   * @returns Deserialized value
   */
  static deserialize<T = any>(data: string, store?: string): T {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      throw new CacheSerializationError(
        `Failed to deserialize value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        store,
        'deserialize'
      );
    }
  }

  /**
   * Check if a value needs serialization
   * @param value Value to check
   * @returns True if the value needs serialization
   */
  static needsSerialization(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }
}
