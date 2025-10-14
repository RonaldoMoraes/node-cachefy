import { Cache } from '../src';

/**
 * Comprehensive example showing all Cachefy features
 * This example demonstrates usage with multiple stores
 */
async function comprehensiveExample() {
  console.log('🚀 Cachefy Comprehensive Example\n');

  // Configuration with all three drivers
  const config = {
    default: 'memory',
    globalTtl: 3600, // 1 hour default
    stores: {
      // Fast in-memory cache for frequently accessed data
      memory: {
        driver: 'memory' as const,
        connection: {
          maxSize: 1000,
          cleanupInterval: 60,
        },
        defaultTtl: 300, // 5 minutes
        keyPrefix: 'mem:',
      },
      // Redis for persistent, distributed cache
      redis: {
        driver: 'redis' as const,
        connection: {
          host: 'localhost',
          port: 6379,
        },
        defaultTtl: 1800, // 30 minutes
        keyPrefix: 'app:',
        errorMode: 'graceful' as const,
        reconnect: {
          maxRetries: 5,
          retryDelay: 1000,
          exponentialBackoff: true,
        },
      },
      // Memcached for shared cache across multiple servers
      memcached: {
        driver: 'memcached' as const,
        connection: {
          servers: ['localhost:11211'],
          options: {
            timeout: 5000,
            retries: 3,
          },
        },
        defaultTtl: 900, // 15 minutes
        keyPrefix: 'mc:',
      },
    },
  };

  try {
    // Initialize the cache system
    console.log('📦 Initializing cache system...');
    await Cache.initialize(config);
    console.log('✅ Cache system initialized\n');

    // === Basic Operations ===
    console.log('🔧 Basic Operations:');
    
    // Set and get with default store (memory)
    await Cache.set('user:123', { 
      id: 123, 
      name: 'John Doe', 
      email: 'john@example.com',
      preferences: { theme: 'dark', lang: 'en' }
    });
    
    const user = await Cache.get('user:123');
    console.log('User from memory:', user);

    // === Type Safety ===
    console.log('\n🎯 Type Safety:');
    
    interface UserProfile {
      id: number;
      name: string;
      email: string;
      lastLogin?: Date;
    }
    
    const profile: UserProfile = {
      id: 456,
      name: 'Jane Smith',
      email: 'jane@example.com',
      lastLogin: new Date(),
    };
    
    await Cache.set<UserProfile>('profile:456', profile);
    const retrievedProfile = await Cache.get<UserProfile>('profile:456');
    console.log('Type-safe profile:', retrievedProfile);

    // === Multiple Stores ===
    console.log('\n🔄 Multiple Store Usage:');
    
    // Use different stores for different purposes
    await Cache.store('memory').set('session:temp', { token: 'abc123', expires: Date.now() + 300000 });
    await Cache.store('redis').set('user:cache:456', profile, 3600);
    await Cache.store('memcached').set('config:app', { version: '1.0.0', features: ['cache', 'auth'] });
    
    console.log('Session (memory):', await Cache.store('memory').get('session:temp'));
    console.log('User cache (redis):', await Cache.store('redis').get('user:cache:456'));
    console.log('Config (memcached):', await Cache.store('memcached').get('config:app'));

    // === Bulk Operations ===
    console.log('\n📦 Bulk Operations:');
    
    const bulkData = {
      'product:1': { id: 1, name: 'Laptop', price: 999 },
      'product:2': { id: 2, name: 'Mouse', price: 29 },
      'product:3': { id: 3, name: 'Keyboard', price: 79 },
    };
    
    await Cache.setMultiple(bulkData, 600); // 10 minutes TTL
    const products = await Cache.getMultiple(['product:1', 'product:2', 'product:3', 'product:404']);
    console.log('Bulk products:', products);

    // === Numeric Operations ===
    console.log('\n🔢 Numeric Operations:');
    
    await Cache.set('page_views', 1000);
    const incremented = await Cache.increment('page_views', 50);
    console.log('Page views after increment:', incremented);
    
    const decremented = await Cache.decrement('page_views', 10);
    console.log('Page views after decrement:', decremented);

    // Counter for new metric
    const newCounter = await Cache.increment('new_signups', 1);
    console.log('New signups counter:', newCounter);

    // === Statistics ===
    console.log('\n📊 Cache Statistics:');
    
    const stats = await Cache.getStats();
    console.log('Cache stats:', {
      connected: stats.connected,
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      memoryUsage: `${Math.round((stats.memoryUsage || 0) / 1024)} KB`,
    });

    // === Error Handling Demonstration ===
    console.log('\n🛡️ Error Handling:');
    
    try {
      // This might fail if Redis is not available
      await Cache.store('redis').set('test:error', 'test data');
      console.log('Redis operation successful');
    } catch (error) {
      console.log('Redis operation failed (graceful handling):', error instanceof Error ? error.message : error);
    }

    // === Cleanup Operations ===
    console.log('\n🧹 Cleanup Operations:');
    
    const deleted = await Cache.delete('session:temp');
    console.log('Session deleted:', deleted);
    
    const deletedCount = await Cache.deleteMultiple(['product:1', 'product:2', 'nonexistent']);
    console.log('Bulk delete count:', deletedCount);
    
    const exists = await Cache.exists('user:123');
    console.log('User still exists:', exists);

    console.log('\n🎉 All operations completed successfully!');

  } catch (error) {
    console.error('\n❌ Error occurred:', error);
  } finally {
    // Always cleanup
    console.log('\n🔌 Disconnecting from cache stores...');
    await Cache.disconnect();
    console.log('✅ Disconnected successfully');
  }
}

// Run the example
if (require.main === module) {
  comprehensiveExample().catch(console.error);
}

export default comprehensiveExample;