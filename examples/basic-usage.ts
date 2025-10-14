import { Cache } from '../src';

async function main() {
  // Example configuration with multiple stores
  const config = {
    default: 'memory' as const,
    stores: {
      memory: {
        driver: 'memory' as const,
        connection: {
          maxSize: 1000,
          cleanupInterval: 60,
        },
        defaultTtl: 300,
      },
      redis: {
        driver: 'redis' as const,
        connection: {
          host: 'localhost',
          port: 6379,
        },
        defaultTtl: 3600,
        keyPrefix: 'myapp:',
      },
      memcached: {
        driver: 'memcached' as const,
        connection: {
          servers: ['localhost:11211'],
        },
        defaultTtl: 1800,
      },
    },
  };

  try {
    // Initialize the cache system
    await Cache.initialize(config);

    console.log('✅ Cache system initialized successfully');

    // Use the default store (memory)
    await Cache.set('user:123', { name: 'John Doe', email: 'john@example.com' });
    const user = await Cache.get<{ name: string; email: string }>('user:123');
    console.log('Default store user:', user);

    // Use a specific store (memory in this case)
    await Cache.store('memory').set('session:abc', { userId: 123, token: 'xyz' });
    const session = await Cache.store('memory').get('session:abc');
    console.log('Memory store session:', session);

    // Test increment/decrement
    await Cache.set('counter', 10);
    const incremented = await Cache.increment('counter', 5);
    console.log('Incremented counter:', incremented);

    const decremented = await Cache.decrement('counter', 3);
    console.log('Decremented counter:', decremented);

    // Test multiple operations
    await Cache.setMultiple({
      'key1': 'value1',
      'key2': { data: 'value2' },
      'key3': 42,
    });

    const multipleValues = await Cache.getMultiple(['key1', 'key2', 'key3', 'nonexistent']);
    console.log('Multiple values:', multipleValues);

    // Test exists
    const exists = await Cache.exists('key1');
    console.log('Key1 exists:', exists);

    // Test delete
    const deleted = await Cache.delete('key1');
    console.log('Key1 deleted:', deleted);

    const existsAfterDelete = await Cache.exists('key1');
    console.log('Key1 exists after delete:', existsAfterDelete);

    // Get cache stats
    const stats = await Cache.getStats();
    console.log('Cache stats:', stats);

    console.log('✅ All operations completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    await Cache.disconnect();
    console.log('✅ Cache disconnected');
  }
}

// Run the example
main().catch(console.error);