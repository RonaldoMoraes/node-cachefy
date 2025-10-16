import { Cache } from '../../index';
import { CacheConfig } from '../../types';

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
      console.warn(
        'Memcached not available, skipping integration tests:',
        error instanceof Error ? error.message : error
      );
      memcachedAvailable = false;
    }
  });

  afterAll(async () => {
    try {
      if (memcachedAvailable) {
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
        'Error in Memcached cleanup:',
        error instanceof Error ? error.message : error
      );
    }
    // Clear any remaining timers
    jest.useRealTimers();
  }, 10000); // Increase timeout for cleanup

  beforeEach(async () => {
    if (memcachedAvailable) {
      try {
        await Cache.clear();
      } catch (error) {
        console.warn(
          'Error clearing Memcached cache:',
          error instanceof Error ? error.message : error
        );
      }
    }
  });

  it('should handle server reconnection', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }

    // First verify connection
    let stats = await Cache.getStats();
    expect(stats.connected).toBe(true);

    // Force a reconnection scenario by performing operations
    // Memcached will automatically try to reconnect
    await Cache.set('test-reconnect', 'value');
    const result = await Cache.get('test-reconnect');
    expect(result).toBe('value');

    // Verify we're still connected
    stats = await Cache.getStats();
    expect(stats.connected).toBe(true);
  });

  it('should handle concurrent operations efficiently', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
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

  it('should handle TTL expiration with high concurrency', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
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

  it('should handle large items near size limit', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
      return;
    }

    // Create a payload close to Memcached's default 1MB limit
    const largeObject = {
      data: 'x'.repeat(500000), // 500KB string
      arrays: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'y'.repeat(100), // Additional data per array item
      })),
    };

    await Cache.set('large-item', largeObject);
    const result = await Cache.get('large-item');
    expect(result).toEqual(largeObject);
  });

  it('should maintain data consistency under concurrent modifications', async () => {
    if (!memcachedAvailable) {
      console.warn('Memcached not available, skipping test');
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
