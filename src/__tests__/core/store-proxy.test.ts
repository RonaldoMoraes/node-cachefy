/**
 * Unit Tests for CacheStoreProxy
 * -----------------------------
 * These tests verify the functionality of the CacheStoreProxy class, which acts as a proxy
 * between the Cache class and individual cache drivers.
 *
 * Test Structure:
 * 1. Basic Operations (get, set, delete, exists, clear)
 * 2. Bulk Operations (getMultiple, setMultiple, deleteMultiple)
 * 3. Counter Operations (increment, decrement)
 * 4. Statistics (getStats)
 * 5. Error Handling
 *
 * Mock Setup:
 * - mockDriver: Implements CacheDriver interface for simulating cache operations
 * - mockStoreProvider: Implements StoreProvider interface for simulating store management
 *
 * Usage:
 * ```typescript
 * // To run all tests
 * npm test src/__tests__/core/store-proxy.test.ts
 *
 * // To run specific test suite
 * npm test src/__tests__/core/store-proxy.test.ts -t "basic operations"
 * ```
 *
 * Adding New Tests:
 * 1. Identify the appropriate describe block for your test
 * 2. Add a new test case following the pattern:
 *    - Setup mock behavior
 *    - Execute operation
 *    - Verify store provider call
 *    - Verify driver method call
 *    - Assert results
 *
 * Example:
 * ```typescript
 * it('should handle new operation', async () => {
 *   mockDriver.newOperation.mockResolvedValue(result);
 *   const result = await storeProxy.newOperation();
 *   expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
 *   expect(mockDriver.newOperation).toHaveBeenCalled();
 *   expect(result).toEqual(expectedResult);
 * });
 * ```
 */

import { CacheStoreProxy } from '../../core/store-proxy';
import { StoreProvider } from '../../interfaces/store-provider.interface';
import { CacheDriver, CacheStats } from '../../types/driver';

describe('CacheStoreProxy', () => {
  // Mock store driver implementation
  const mockDriver: jest.Mocked<CacheDriver> = {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    clear: jest.fn(),
    getMultiple: jest.fn(),
    setMultiple: jest.fn(),
    deleteMultiple: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    getStats: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
  };

  // Mock store provider
  const mockStoreProvider: jest.Mocked<StoreProvider> = {
    getStore: jest.fn().mockResolvedValue(mockDriver),
  };

  const storeName = 'test-store';
  let storeProxy: CacheStoreProxy;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    storeProxy = new CacheStoreProxy(storeName, mockStoreProvider);
  });

  describe('get', () => {
    it('should get value from store', async () => {
      const mockValue = { test: 'value' };
      mockDriver.get.mockResolvedValue(mockValue);

      const result = await storeProxy.get('test-key');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe(mockValue);
    });

    it('should return null for non-existent key', async () => {
      mockDriver.get.mockResolvedValue(null);

      const result = await storeProxy.get('non-existent');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.get).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in store with TTL', async () => {
      const value = { test: 'value' };
      mockDriver.set.mockResolvedValue(undefined);

      await storeProxy.set('test-key', value, 60);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.set).toHaveBeenCalledWith('test-key', value, 60);
    });

    it('should set value without TTL', async () => {
      const value = 'test';
      mockDriver.set.mockResolvedValue(undefined);

      await storeProxy.set('test-key', value);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.set).toHaveBeenCalledWith('test-key', value, undefined);
    });
  });

  describe('delete', () => {
    it('should delete key from store', async () => {
      mockDriver.delete.mockResolvedValue(true);

      const result = await storeProxy.delete('test-key');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.delete).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockDriver.delete.mockResolvedValue(false);

      const result = await storeProxy.delete('non-existent');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.delete).toHaveBeenCalledWith('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should check if key exists in store', async () => {
      mockDriver.exists.mockResolvedValue(true);

      const result = await storeProxy.exists('test-key');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.exists).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear store', async () => {
      mockDriver.clear.mockResolvedValue(undefined);

      await storeProxy.clear();

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.clear).toHaveBeenCalled();
    });
  });

  describe('bulk operations', () => {
    it('should get multiple values', async () => {
      const mockResults = { key1: 'value1', key2: null };
      mockDriver.getMultiple.mockResolvedValue(mockResults);

      const result = await storeProxy.getMultiple(['key1', 'key2']);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.getMultiple).toHaveBeenCalledWith(['key1', 'key2']);
      expect(result).toEqual(mockResults);
    });

    it('should set multiple values with TTL', async () => {
      const entries = { key1: 'value1', key2: 'value2' };
      mockDriver.setMultiple.mockResolvedValue(undefined);

      await storeProxy.setMultiple(entries, 60);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.setMultiple).toHaveBeenCalledWith(entries, 60);
    });

    it('should delete multiple keys', async () => {
      mockDriver.deleteMultiple.mockResolvedValue(2);

      const result = await storeProxy.deleteMultiple(['key1', 'key2']);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.deleteMultiple).toHaveBeenCalledWith(['key1', 'key2']);
      expect(result).toBe(2);
    });
  });

  describe('counter operations', () => {
    it('should increment value', async () => {
      mockDriver.increment.mockResolvedValue(11);

      const result = await storeProxy.increment('counter', 1);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.increment).toHaveBeenCalledWith('counter', 1);
      expect(result).toBe(11);
    });

    it('should increment without amount', async () => {
      mockDriver.increment.mockResolvedValue(1);

      const result = await storeProxy.increment('counter');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.increment).toHaveBeenCalledWith('counter', undefined);
      expect(result).toBe(1);
    });

    it('should decrement value', async () => {
      mockDriver.decrement.mockResolvedValue(9);

      const result = await storeProxy.decrement('counter', 1);

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.decrement).toHaveBeenCalledWith('counter', 1);
      expect(result).toBe(9);
    });

    it('should decrement without amount', async () => {
      mockDriver.decrement.mockResolvedValue(-1);

      const result = await storeProxy.decrement('counter');

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.decrement).toHaveBeenCalledWith('counter', undefined);
      expect(result).toBe(-1);
    });
  });

  describe('stats', () => {
    it('should get store statistics', async () => {
      const mockStats: CacheStats = {
        hits: 100,
        misses: 20,
        keys: 50,
        size: 1024,
        connected: true,
      };
      mockDriver.getStats.mockResolvedValue(mockStats);

      const result = await storeProxy.getStats();

      expect(mockStoreProvider.getStore).toHaveBeenCalledWith(storeName);
      expect(mockDriver.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('error handling', () => {
    it('should propagate store provider errors', async () => {
      const error = new Error('Store provider error');
      mockStoreProvider.getStore.mockRejectedValueOnce(error);

      await expect(storeProxy.get('key')).rejects.toThrow(error);
    });

    it('should propagate driver errors', async () => {
      const error = new Error('Driver error');
      mockDriver.get.mockRejectedValueOnce(error);

      await expect(storeProxy.get('key')).rejects.toThrow(error);
    });
  });
});
