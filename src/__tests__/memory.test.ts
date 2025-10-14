import { Cache } from '../index';

describe('Cache Memory Driver', () => {
  beforeEach(async () => {
    const config = {
      default: 'memory' as const,
      stores: {
        memory: {
          driver: 'memory' as const,
          connection: {
            maxSize: 100,
            cleanupInterval: 1,
          },
          defaultTtl: 1, // 1 second for testing
        },
      },
    };

    await Cache.initialize(config);
  });

  afterEach(async () => {
    await Cache.disconnect();
  });

  test('should store and retrieve values', async () => {
    await Cache.set('test-key', 'test-value');
    const value = await Cache.get('test-key');
    expect(value).toBe('test-value');
  });

  test('should handle objects', async () => {
    const testObj = { name: 'John', age: 30, active: true };
    await Cache.set('user', testObj);
    const retrieved = await Cache.get<typeof testObj>('user');
    expect(retrieved).toEqual(testObj);
  });

  test('should return null for non-existent keys', async () => {
    const value = await Cache.get('non-existent');
    expect(value).toBeNull();
  });

  test('should handle TTL expiration', async () => {
    await Cache.set('ttl-test', 'value', 1); // 1 second TTL
    let value = await Cache.get('ttl-test');
    expect(value).toBe('value');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    value = await Cache.get('ttl-test');
    expect(value).toBeNull();
  });

  test('should delete keys', async () => {
    await Cache.set('delete-test', 'value');
    const deleted = await Cache.delete('delete-test');
    expect(deleted).toBe(true);
    
    const value = await Cache.get('delete-test');
    expect(value).toBeNull();
  });

  test('should check key existence', async () => {
    await Cache.set('exists-test', 'value');
    const exists = await Cache.exists('exists-test');
    expect(exists).toBe(true);

    const notExists = await Cache.exists('not-exists');
    expect(notExists).toBe(false);
  });

  test('should handle multiple operations', async () => {
    const entries = {
      'key1': 'value1',
      'key2': { data: 'value2' },
      'key3': 42,
    };

    await Cache.setMultiple(entries);
    const results = await Cache.getMultiple(['key1', 'key2', 'key3', 'missing']);
    
    expect(results).toEqual({
      'key1': 'value1',
      'key2': { data: 'value2' },
      'key3': 42,
      'missing': null,
    });
  });

  test('should increment and decrement', async () => {
    await Cache.set('counter', 10);
    
    const incremented = await Cache.increment('counter', 5);
    expect(incremented).toBe(15);
    
    const decremented = await Cache.decrement('counter', 3);
    expect(decremented).toBe(12);
  });

  test('should handle increment on non-existent key', async () => {
    const result = await Cache.increment('new-counter', 5);
    expect(result).toBe(5);
  });

  test('should clear all cache', async () => {
    await Cache.set('key1', 'value1');
    await Cache.set('key2', 'value2');
    
    await Cache.clear();
    
    const value1 = await Cache.get('key1');
    const value2 = await Cache.get('key2');
    
    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });

  test('should provide stats', async () => {
    await Cache.set('stats-test', 'value');
    await Cache.get('stats-test'); // hit
    await Cache.get('non-existent'); // miss
    
    const stats = await Cache.getStats();
    
    expect(stats.connected).toBe(true);
    expect(stats.hits).toBeGreaterThan(0);
    expect(stats.misses).toBeGreaterThan(0);
    expect(stats.keys).toBeGreaterThan(0);
  });
});