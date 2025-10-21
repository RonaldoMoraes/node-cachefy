import { Cache } from '../cache';
import { CacheDriver } from '../types/driver';
import { CacheConfig } from '../types/config';
import { CacheConfigurationError } from '../types/errors';
import { CacheDriverFactory } from '../factories/driver.factory';
import { StoreManager } from '../managers/store.manager';
import { CacheStoreProxy } from '../core/store-proxy';

// Mock all dependencies
jest.mock('../factories/driver.factory');
jest.mock('../managers/store.manager');
jest.mock('../core/store-proxy');

describe('Cache', () => {
  // Mock driver implementation
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

  // Mock configuration
  const mockConfig: CacheConfig = {
    default: 'memory',
    stores: {
      memory: {
        driver: 'memory',
        connection: {},
      },
    },
  };

  // Mock store manager
  const mockStoreManager = {
    getStore: jest.fn().mockResolvedValue(mockDriver),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset Cache static state
    Cache['defaultStore'] = null;
    Cache['storeManager'] = null;

    // Setup mocks
    (StoreManager as jest.MockedClass<typeof StoreManager>).prototype.getStore =
      mockStoreManager.getStore;
    (
      StoreManager as jest.MockedClass<typeof StoreManager>
    ).prototype.disconnect = mockStoreManager.disconnect;
  });

  describe('initialize', () => {
    it('should initialize cache with configuration', async () => {
      await Cache.initialize(mockConfig);

      expect(Cache['defaultStore']).toBe('memory');
      expect(Cache['storeManager']).toBeDefined();
      expect(mockStoreManager.getStore).toHaveBeenCalledWith('memory');
    });

    it('should throw if config is invalid', async () => {
      // Setup mock to throw for non-existent store
      mockStoreManager.getStore.mockRejectedValueOnce(
        new CacheConfigurationError(
          "Store 'non-existent-store' not found in configuration."
        )
      );

      const invalidConfig = {
        stores: {}, // missing default store
        default: 'non-existent-store',
      };
      await expect(Cache.initialize(invalidConfig)).rejects.toThrow(
        CacheConfigurationError
      );
    });
  });

  describe('store operations', () => {
    beforeEach(async () => {
      await Cache.initialize(mockConfig);
    });

    describe('get', () => {
      it('should get value from default store', async () => {
        const mockValue = { test: 'value' };
        mockDriver.get.mockResolvedValue(mockValue);

        const result = await Cache.get('test-key');

        expect(result).toBe(mockValue);
        expect(mockDriver.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null for non-existent key', async () => {
        mockDriver.get.mockResolvedValue(null);

        const result = await Cache.get('non-existent');

        expect(result).toBeNull();
        expect(mockDriver.get).toHaveBeenCalledWith('non-existent');
      });
    });

    describe('set', () => {
      it('should set value in default store', async () => {
        const value = { test: 'value' };
        await Cache.set('test-key', value, 60);

        expect(mockDriver.set).toHaveBeenCalledWith('test-key', value, 60);
      });

      it('should set value without TTL', async () => {
        const value = 'test';
        await Cache.set('test-key', value);

        expect(mockDriver.set).toHaveBeenCalledWith(
          'test-key',
          value,
          undefined
        );
      });
    });

    describe('delete', () => {
      it('should delete key from default store', async () => {
        mockDriver.delete.mockResolvedValue(true);

        const result = await Cache.delete('test-key');

        expect(result).toBe(true);
        expect(mockDriver.delete).toHaveBeenCalledWith('test-key');
      });

      it('should return false if key does not exist', async () => {
        mockDriver.delete.mockResolvedValue(false);

        const result = await Cache.delete('non-existent');

        expect(result).toBe(false);
        expect(mockDriver.delete).toHaveBeenCalledWith('non-existent');
      });
    });

    describe('bulk operations', () => {
      it('should get multiple values', async () => {
        const mockResults = { key1: 'value1', key2: null };
        mockDriver.getMultiple.mockResolvedValue(mockResults);

        const result = await Cache.getMultiple(['key1', 'key2']);

        expect(result).toEqual(mockResults);
        expect(mockDriver.getMultiple).toHaveBeenCalledWith(['key1', 'key2']);
      });

      it('should set multiple values', async () => {
        const entries = { key1: 'value1', key2: 'value2' };
        await Cache.setMultiple(entries, 60);

        expect(mockDriver.setMultiple).toHaveBeenCalledWith(entries, 60);
      });

      it('should delete multiple keys', async () => {
        mockDriver.deleteMultiple.mockResolvedValue(2);

        const result = await Cache.deleteMultiple(['key1', 'key2']);

        expect(result).toBe(2);
        expect(mockDriver.deleteMultiple).toHaveBeenCalledWith([
          'key1',
          'key2',
        ]);
      });
    });

    describe('counter operations', () => {
      it('should increment value', async () => {
        mockDriver.increment.mockResolvedValue(11);

        const result = await Cache.increment('counter', 1);

        expect(result).toBe(11);
        expect(mockDriver.increment).toHaveBeenCalledWith('counter', 1);
      });

      it('should decrement value', async () => {
        mockDriver.decrement.mockResolvedValue(9);

        const result = await Cache.decrement('counter', 1);

        expect(result).toBe(9);
        expect(mockDriver.decrement).toHaveBeenCalledWith('counter', 1);
      });
    });
  });

  describe('store selection', () => {
    beforeEach(async () => {
      await Cache.initialize(mockConfig);
    });

    it('should create store proxy for specific store', () => {
      const storeProxy = Cache.store('memory');

      expect(storeProxy).toBeInstanceOf(CacheStoreProxy);
      expect(CacheStoreProxy).toHaveBeenCalledWith(
        'memory',
        expect.any(StoreManager)
      );
    });

    it('should throw if store is accessed before initialization', () => {
      Cache['storeManager'] = null;

      expect(() => Cache.store('memory')).toThrow(CacheConfigurationError);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await Cache.initialize(mockConfig);
    });

    it('should disconnect all stores', async () => {
      await Cache.disconnect();

      expect(mockStoreManager.disconnect).toHaveBeenCalled();
      expect(Cache['storeManager']).toBeNull();
      expect(Cache['defaultStore']).toBeNull();
    });

    it('should handle disconnect when not initialized', async () => {
      Cache['storeManager'] = null;
      await Cache.disconnect();

      expect(mockStoreManager.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw if accessing store before initialization', async () => {
      await expect(Cache.get('test')).rejects.toThrow(CacheConfigurationError);
      await expect(Cache.set('test', 'value')).rejects.toThrow(
        CacheConfigurationError
      );
      await expect(Cache.delete('test')).rejects.toThrow(
        CacheConfigurationError
      );
    });

    it('should throw if default store is not set', async () => {
      Cache['storeManager'] = new StoreManager(
        mockConfig,
        new CacheDriverFactory()
      );
      Cache['defaultStore'] = null;

      await expect(Cache.get('test')).rejects.toThrow(CacheConfigurationError);
    });
  });
});
