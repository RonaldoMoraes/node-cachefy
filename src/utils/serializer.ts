import { CacheSerializationError } from '../types/errors';

/**
 * Serialize a value for storage
 * @param value Value to serialize
 * @param store Store name for error context
 * @returns Serialized string
 */
export function serialize(value: any, store?: string): string {
  try {
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
export function deserialize<T = any>(data: string, store?: string): T {
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
