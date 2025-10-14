import { Cache } from '../index';
import { CacheConfig } from '../types';

describe('Cache Memcached Driver Integration', () => {
  const config: CacheConfig = {
    default: 'memcached',
    stores: {
      memcached: {
        driver: 'memcached',
        connection: {
          servers: ['localhost:11211'],
        },
        defaultTtl: 300,
        keyPrefix: 'test:',
      },
    },
  };

  let memcachedAvailable = false;

  beforeAll(async () => {
    try {
      await Cache.initialize(config);
      memcachedAvailable = true;
    } catch (error) {
      console.warn('Memcached not available, skipping integration tests:', error instanceof Error ? error.message : error);
      memcachedAvailable = false;
    }
  });

  afterAll(async () => {
    if (memcachedAvailable) {
      try {
        await Cache.clear();
        await Cache.disconnect();
      } catch (error) {
        console.warn('Error disconnecting from Memcached:', error instanceof Error ? error.message : error);
      }
    }
  });

  beforeEach(async () => {
    if (memcachedAvailable) {
      try {
        await Cache.clear();
      } catch (error) {
        console.warn('Error clearing Memcached cache:', error instanceof Error ? error.message : error);
      }
    }
  });

  it('should connect to Memcached successfully', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    const stats = await Cache.getStats();
    expect(stats.connected).toBe(true);
  });

  it('should store and retrieve string values', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    await Cache.set('string-key', 'hello world');
    const result = await Cache.get<string>('string-key');
    expect(result).toBe('hello world');
  });

  it('should store and retrieve object values', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    const testObject = { name: 'Jane', age: 25, active: false };
    await Cache.set('object-key', testObject);
    const result = await Cache.get<typeof testObject>('object-key');
    expect(result).toEqual(testObject);
  });

  it('should handle TTL expiration', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
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
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    await Cache.set('delete-key', 'to be deleted');
    expect(await Cache.exists('delete-key')).toBe(true);
    
    const deleted = await Cache.delete('delete-key');
    expect(deleted).toBe(true);
    expect(await Cache.exists('delete-key')).toBe(false);
  });

  it('should handle multiple operations', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
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
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    await Cache.set('counter', 20);
    
    const incremented = await Cache.increment('counter', 7);
    expect(incremented).toBe(27);
    
    const decremented = await Cache.decrement('counter', 4);
    expect(decremented).toBe(23);
  });

  it('should handle increment on non-existent key', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    const result = await Cache.increment('new-counter-mc', 8);
    expect(result).toBe(8);
  });

  it('should provide accurate statistics', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
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
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    await Cache.set('prefixed-key', 'test-value');
    
    // The key should be stored with prefix in Memcached
    // But retrieved normally through our API
    const result = await Cache.get('prefixed-key');
    expect(result).toBe('test-value');
  });

  it('should handle arrays and nested objects', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }
    
    const complexObject = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ],
      metadata: {
        created: '2025-01-01',
        version: '1.0.0',
        tags: ['cache', 'memcached', 'test']
      }
    };

    await Cache.set('complex-object', complexObject);
    const result = await Cache.get('complex-object');
    expect(result).toEqual(complexObject);
  });
});