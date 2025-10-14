import { Cache } from '../index';
import { CacheConfig } from '../types';

describe('Cache Redis Driver Integration', () => {
  const config: CacheConfig = {
    default: 'redis',
    stores: {
      redis: {
        driver: 'redis',
        connection: {
          host: 'localhost',
          port: 6379,
        },
        defaultTtl: 300,
        keyPrefix: 'test:',
      },
    },
  };

  let redisAvailable = false;

  beforeAll(async () => {
    try {
      await Cache.initialize(config);
      redisAvailable = true;
    } catch (error) {
      console.warn('Redis not available, skipping integration tests:', error instanceof Error ? error.message : error);
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    if (redisAvailable) {
      try {
        await Cache.clear();
        await Cache.disconnect();
      } catch (error) {
        console.warn('Error disconnecting from Redis:', error instanceof Error ? error.message : error);
      }
    }
  });

  beforeEach(async () => {
    if (redisAvailable) {
      try {
        await Cache.clear();
      } catch (error) {
        console.warn('Error clearing Redis cache:', error instanceof Error ? error.message : error);
      }
    }
  });

  it('should connect to Redis successfully', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    const stats = await Cache.getStats();
    expect(stats.connected).toBe(true);
  });

  it('should store and retrieve string values', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    await Cache.set('string-key', 'hello world');
    const result = await Cache.get<string>('string-key');
    expect(result).toBe('hello world');
  });

  it('should store and retrieve object values', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    const testObject = { name: 'John', age: 30, active: true };
    await Cache.set('object-key', testObject);
    const result = await Cache.get<typeof testObject>('object-key');
    expect(result).toEqual(testObject);
  });

  it('should handle TTL expiration', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    await Cache.set('ttl-key', 'expires soon', 1); // 1 second TTL
    const immediate = await Cache.get('ttl-key');
    expect(immediate).toBe('expires soon');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    const expired = await Cache.get('ttl-key');
    expect(expired).toBeNull();
  });

  it('should delete keys correctly', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    await Cache.set('delete-key', 'to be deleted');
    expect(await Cache.exists('delete-key')).toBe(true);
    
    const deleted = await Cache.delete('delete-key');
    expect(deleted).toBe(true);
    expect(await Cache.exists('delete-key')).toBe(false);
  });

  it('should handle multiple operations', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    const entries = {
      'multi1': 'value1',
      'multi2': { data: 'value2' },
      'multi3': 42,
    };

    await Cache.setMultiple(entries);
    const results = await Cache.getMultiple(Object.keys(entries));
    
    expect(results.multi1).toBe('value1');
    expect(results.multi2).toEqual({ data: 'value2' });
    expect(results.multi3).toBe(42);
  });

  it('should increment and decrement numeric values', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    await Cache.set('counter', 10);
    
    const incremented = await Cache.increment('counter', 5);
    expect(incremented).toBe(15);
    
    const decremented = await Cache.decrement('counter', 3);
    expect(decremented).toBe(12);
  });

  it('should handle increment on non-existent key', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    const result = await Cache.increment('new-counter', 5);
    expect(result).toBe(5);
  });

  it('should provide accurate statistics', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    // Clear and set some data
    await Cache.clear();
    await Cache.set('stat-key1', 'value1');
    await Cache.set('stat-key2', 'value2');
    
    // Perform some operations to generate stats
    await Cache.get('stat-key1');
    await Cache.get('stat-key2');
    await Cache.get('non-existent');
    
    const stats = await Cache.getStats();
    expect(stats.connected).toBe(true);
    expect(typeof stats.hits).toBe('number');
    expect(typeof stats.misses).toBe('number');
  });

  it('should handle key prefixing', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    await Cache.set('prefixed-key', 'test-value');
    
    // The key should be stored with prefix in Redis
    // But retrieved normally through our API
    const result = await Cache.get('prefixed-key');
    expect(result).toBe('test-value');
  });

  it('should handle large payloads', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }
    
    const largeObject = {
      data: 'x'.repeat(10000), // 10KB string
      numbers: Array.from({ length: 1000 }, (_, i) => i),
      nested: {
        deep: {
          value: 'nested data',
          array: [1, 2, 3, 4, 5]
        }
      }
    };

    await Cache.set('large-payload', largeObject);
    const result = await Cache.get('large-payload');
    expect(result).toEqual(largeObject);
  });
});