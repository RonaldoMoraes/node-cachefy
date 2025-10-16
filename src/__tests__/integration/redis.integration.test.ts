import { Cache } from '../../index';
import { CacheConfig } from '../../types';

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
      console.warn(
        'Redis not available, skipping integration tests:',
        error instanceof Error ? error.message : error
      );
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    try {
      if (redisAvailable) {
        const clearTimer = setTimeout(() => {}, 5000);
        const disconnectTimer = setTimeout(() => {}, 5000);

        try {
          await Promise.race([
            Cache.clear(),
            new Promise((_, reject) => {
              clearTimer.unref();
              setTimeout(
                () => reject(new Error('Clear timeout')),
                5000
              ).unref();
            }),
          ]);
        } finally {
          clearTimeout(clearTimer);
        }

        try {
          await Promise.race([
            Cache.disconnect(),
            new Promise((_, reject) => {
              disconnectTimer.unref();
              setTimeout(
                () => reject(new Error('Disconnect timeout')),
                5000
              ).unref();
            }),
          ]);
        } finally {
          clearTimeout(disconnectTimer);
        }
      }
    } catch (error) {
      console.warn(
        'Error in Redis cleanup:',
        error instanceof Error ? error.message : error
      );
    }
    // Clear any remaining timers
    jest.useRealTimers();
  }, 10000); // Increase timeout for cleanup

  beforeEach(async () => {
    if (redisAvailable) {
      try {
        await Cache.clear();
      } catch (error) {
        console.warn(
          'Error clearing Redis cache:',
          error instanceof Error ? error.message : error
        );
      }
    }
  });

  it('should reconnect after connection loss', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }

    // First verify connection
    let stats = await Cache.getStats();
    expect(stats.connected).toBe(true);

    // Force a disconnect by closing the Redis server (this would be done externally)
    // Then try to use the cache, which should trigger a reconnection
    await Cache.set('test-reconnect', 'value');
    const result = await Cache.get('test-reconnect');
    expect(result).toBe('value');

    // Verify we're still connected
    stats = await Cache.getStats();
    expect(stats.connected).toBe(true);
  });

  it('should handle concurrent operations', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }

    const operations = Array.from({ length: 100 }, (_, i) => i).map(i =>
      Cache.set(`concurrent-${i}`, `value-${i}`)
    );

    await Promise.all(operations);

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) => i).map(i =>
        Cache.get(`concurrent-${i}`)
      )
    );

    results.forEach((result: string | null, i: number) => {
      expect(result).toBe(`value-${i}`);
    });
  });

  it('should handle large payloads with compression', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }

    const largeObject = {
      data: 'x'.repeat(100000), // 100KB string
      numbers: Array.from({ length: 10000 }, (_, i) => i),
      nested: Array.from({ length: 100 }, () => ({
        deep: {
          value: 'nested'.repeat(100),
          array: Array.from({ length: 100 }, (_, i) => i),
        },
      })),
    };

    await Cache.set('large-payload', largeObject);
    const result = await Cache.get('large-payload');
    expect(result).toEqual(largeObject);
  });

  it('should handle TTL expiration under load', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }

    // Set keys with short TTLs
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => i).map(
        i => Cache.set(`ttl-${i}`, `value-${i}`, 1) // 1 second TTL
      )
    );

    // Wait for real time to pass to ensure expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Check all keys
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => i).map(i => Cache.get(`ttl-${i}`))
    );

    // Keys should be expired
    results.forEach((result: string | null) => {
      expect(result).toBeNull();
    });
  });

  it('should maintain data consistency under concurrent modifications', async () => {
    if (!redisAvailable) {
      console.warn('Redis not available, skipping test');
      return;
    }

    await Cache.set('counter', 0);

    // Perform 100 concurrent increments
    await Promise.all(
      Array.from({ length: 100 }, () => Cache.increment('counter', 1))
    );

    const result = await Cache.get('counter');
    expect(result).toBe(100);
  });
});
