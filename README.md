# Cachefy

**A flexible, type-safe caching abstraction layer for Node.js/TypeScript applications**

Cachefy is a modern caching library that provides a unified interface for multiple cache backends. Whether you need in-memory caching for development, Redis for production, or Memcached for distributed systems, Cachefy lets you switch between them seamlessly with full TypeScript support.

## What is Cachefy?

Cachefy solves the common problem of cache vendor lock-in by providing:

- **Single API**: One consistent interface for all cache operations
- **Multiple Backends**: Support for Memory, Redis, and Memcached drivers
- **Type Safety**: Full TypeScript support with generic types and auto-completion
- **Production Ready**: Built-in error handling, auto-reconnection, and monitoring
- **Zero Configuration**: Works out of the box with sensible defaults
- **Flexible Architecture**: Use different stores for different use cases in the same application
- **Smart Store Management**: Centralized store management with proxy pattern for safe store access
- **Reliable Testing**: Comprehensive test suite with proper cleanup and timeout handling

Perfect for applications that need reliable caching with the flexibility to change backends as requirements evolve.

## Features

- 🚀 **Type-safe**: Full TypeScript support with generic types
- 🔄 **Multiple stores**: Redis, Memcached, and in-memory drivers
- 🎯 **Singleton pattern**: Efficient resource management
- 🔌 **Auto-reconnection**: Built-in connection recovery
- ⚡ **Performance**: Optimized for high throughput
- 🛡️ **Error handling**: Configurable error modes (strict/graceful)
- 📊 **Statistics**: Built-in cache statistics
- 🔑 **Key prefixing**: Namespace your cache keys
- ⏰ **TTL support**: Time-to-live for all operations

## Installation

```bash
npm install cachefy
# or
yarn add cachefy
# or
pnpm add cachefy
```

## Quick Start

```typescript
import { Cache } from 'cachefy';

// Configure your cache stores
const config = {
  default: 'memory',
  stores: {
    memory: {
      driver: 'memory',
      connection: {
        maxSize: 1000,
        cleanupInterval: 60,
      },
      defaultTtl: 300,
    },
    redis: {
      driver: 'redis',
      connection: {
        host: 'localhost',
        port: 6379,
      },
      defaultTtl: 3600,
      keyPrefix: 'myapp:',
    },
  },
};

// Initialize the cache system
await Cache.initialize(config);

// Use the default store
await Cache.set('user:123', { name: 'John', email: 'john@example.com' });
const user = await Cache.get<User>('user:123');

// Use a specific store
await Cache.store('redis').set('session:abc', sessionData);
const session = await Cache.store('redis').get('session:abc');
```

## Configuration

### Basic Configuration

```typescript
interface CacheConfig {
  default: string;              // Default store name
  stores: Record<string, StoreConfig>;
  globalTtl?: number;          // Global default TTL in seconds
  globalErrorMode?: 'strict' | 'graceful';
}
```

### Store Configurations

#### Memory Store

```typescript
{
  driver: 'memory',
  connection: {
    maxSize?: number;          // Maximum number of items (default: unlimited)
    maxMemory?: string;        // Maximum memory usage (e.g., '100MB')
    cleanupInterval?: number;  // Cleanup interval in seconds (default: 60)
  },
  defaultTtl?: number;         // Default TTL in seconds
  keyPrefix?: string;          // Key prefix for all operations
  errorMode?: 'strict' | 'graceful';
}
```

#### Redis Store

```typescript
{
  driver: 'redis',
  connection: {
    host?: string;             // Redis host (default: 'localhost')
    port?: number;             // Redis port (default: 6379)
    password?: string;         // Redis password
    database?: number;         // Redis database number
    username?: string;         // Redis username
    url?: string;              // Redis connection URL (overrides host/port)
    connectTimeout?: number;   // Connection timeout in ms
  },
  defaultTtl?: number;
  keyPrefix?: string;
  errorMode?: 'strict' | 'graceful';
  reconnect?: {
    maxRetries?: number;       // Maximum reconnection attempts
    retryDelay?: number;       // Delay between retries in ms
    exponentialBackoff?: boolean; // Use exponential backoff
  };
}
```

#### Memcached Store

```typescript
{
  driver: 'memcached',
  connection: {
    servers?: string | string[]; // Memcached servers (default: ['localhost:11211'])
    options?: {
      maxKeySize?: number;
      maxExpiration?: number;
      maxValue?: number;
      poolSize?: number;
      timeout?: number;
      retries?: number;
      // ... other memcached options
    };
  },
  defaultTtl?: number;
  keyPrefix?: string;
  errorMode?: 'strict' | 'graceful';
  reconnect?: { /* same as Redis */ };
}
```

## API Reference

### Static Methods

#### `Cache.initialize(config)`
Initialize the cache system with the provided configuration.

#### `Cache.store(name)`
Get a specific store instance. Returns a `StoreInstance` with the same API as the static methods.

#### `Cache.disconnect()`
Disconnect all cache stores and clean up resources.

### Cache Operations

#### `Cache.get<T>(key: string): Promise<T | null>`
Retrieve a value from the default cache store.

```typescript
const user = await Cache.get<User>('user:123');
```

#### `Cache.set<T>(key: string, value: T, ttl?: number): Promise<void>`
Store a value in the default cache store.

```typescript
await Cache.set('user:123', { name: 'John' }, 3600); // TTL: 1 hour
```

#### `Cache.delete(key: string): Promise<boolean>`
Delete a key from the default cache store. Returns `true` if the key was deleted.

#### `Cache.exists(key: string): Promise<boolean>`
Check if a key exists in the default cache store.

#### `Cache.clear(): Promise<void>`
Clear all keys from the default cache store.

### Bulk Operations

#### `Cache.getMultiple<T>(keys: string[]): Promise<Record<string, T | null>>`
Get multiple values at once.

```typescript
const results = await Cache.getMultiple(['user:1', 'user:2', 'user:3']);
// { 'user:1': userData, 'user:2': null, 'user:3': userData }
```

#### `Cache.setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<void>`
Set multiple key-value pairs at once.

```typescript
await Cache.setMultiple({
  'user:1': userData1,
  'user:2': userData2,
  'user:3': userData3,
}, 3600);
```

#### `Cache.deleteMultiple(keys: string[]): Promise<number>`
Delete multiple keys at once. Returns the number of keys that were deleted.

### Numeric Operations

#### `Cache.increment(key: string, increment?: number): Promise<number>`
Increment a numeric value. Creates the key with the increment value if it doesn't exist.

#### `Cache.decrement(key: string, decrement?: number): Promise<number>`
Decrement a numeric value. Creates the key with the negative decrement value if it doesn't exist.

### Statistics

#### `Cache.getStats(): Promise<CacheStats>`
Get cache statistics.

```typescript
const stats = await Cache.getStats();
console.log(stats.hits, stats.misses, stats.keys);
```

## Error Handling

Cachefy provides comprehensive error handling with specific error types and two operational modes:

### Error Types

- **CacheError**: Base error class for all cache-related errors
- **CacheConfigurationError**: Configuration and initialization errors
- **CacheConnectionError**: Connection and network-related errors
- **CacheDriverError**: Driver-specific operation errors
- **CacheSerializationError**: Data serialization/deserialization errors

### Error Modes

#### Strict Mode (default)
All errors are thrown and must be handled by your application. This is recommended for development and when you need full control over error handling.

```typescript
try {
  await Cache.set('key', { complex: 'object' });
} catch (error) {
  if (error instanceof CacheSerializationError) {
    console.error('Failed to serialize data:', error.message);
  } else if (error instanceof CacheConnectionError) {
    console.error('Connection failed:', error.message);
  } else {
    console.error('Cache error:', error);
  }
}
```

#### Graceful Mode
Errors are logged but don't throw exceptions. Operations return `null` on failure. This is useful in production when you want to fail silently.

```typescript
// Configure graceful mode
const config = {
  default: 'memory',
  globalErrorMode: 'graceful',
  stores: { /* ... */ }
};

// Operations will return null on error
const result = await Cache.get('key');
if (result === null) {
  // Handle missing data or error case
}
```

### Error Context

All errors provide detailed context:
- Error message with specific details
- Error type and code
- Store name where the error occurred
- Original error (if available)
- Operation that caused the error

## Advanced Usage

### Multiple Store Configuration

```typescript
const config = {
  default: 'redis',
  stores: {
    // Fast memory cache for frequently accessed data
    memory: {
      driver: 'memory',
      connection: { maxSize: 1000 },
      defaultTtl: 300, // 5 minutes
    },
    // Redis for persistent cache
    redis: {
      driver: 'redis',
      connection: { host: 'localhost', port: 6379 },
      defaultTtl: 3600, // 1 hour
      keyPrefix: 'app:',
    },
    // Memcached for distributed cache
    memcached: {
      driver: 'memcached',
      connection: { servers: ['cache1:11211', 'cache2:11211'] },
      defaultTtl: 1800, // 30 minutes
    },
  },
};

await Cache.initialize(config);

// Use different stores for different use cases
await Cache.store('memory').set('session:temp', tempData);
await Cache.store('redis').set('user:profile', userData);
await Cache.store('memcached').set('shared:config', configData);
```

### Type Safety

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe operations
const user = await Cache.get<User>('user:123');
if (user) {
  console.log(user.name); // TypeScript knows this is a string
}

// Multiple typed operations
const users = await Cache.getMultiple<User>(['user:1', 'user:2']);
```

### Custom Key Prefixing

```typescript
const config = {
  default: 'redis',
  stores: {
    redis: {
      driver: 'redis',
      connection: { host: 'localhost' },
      keyPrefix: 'myapp:v1:', // All keys will be prefixed
    },
  },
};

// This will actually store as 'myapp:v1:user:123'
await Cache.set('user:123', userData);
```

## Best Practices

1. **Choose the right store**: Use memory for frequently accessed data, Redis for persistence, Memcached for distributed caching.

2. **Set appropriate TTLs**: Always set TTL values to prevent memory leaks and stale data.

3. **Handle errors gracefully**: Use try-catch blocks or graceful mode for production applications.

4. **Use type annotations**: Leverage TypeScript generics for type safety.

5. **Monitor cache statistics**: Regularly check cache hit rates and memory usage.

6. **Use key prefixes**: Namespace your keys to avoid conflicts in shared environments.

## Requirements

- Node.js 16 or higher
- Redis 6+ (if using Redis driver)
- Memcached 1.4+ (if using Memcached driver)

## Testing

### Testing Architecture

Cachefy follows a well-structured testing approach:

#### Test Organization
- **Unit Tests**: Located in `__tests__/drivers/` - test individual components in isolation
- **Integration Tests**: Located in `__tests__/integration/` - test real-world scenarios with actual cache servers
- **Test Utilities**: Shared test helpers and fixtures for consistent testing

#### Test Features
- **Smart Cleanup**: Automatic resource cleanup with proper timeout handling
- **Graceful Teardown**: Safe disconnection from cache servers
- **Concurrent Testing**: Support for high-load parallel operations
- **Edge Cases**: Tests for connection loss, reconnection, and error scenarios

### Running Tests

```bash
# Install dependencies
npm install

# Run unit tests (no external dependencies)
npm run test:unit

# Run integration tests (requires Redis/Memcached)
npm run test:integration

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Watch mode for development
npm run test:watch
```

### Integration Testing

For testing with real Redis and Memcached instances:

```bash
# Docker setup (recommended)
npm run test:docker          # Runs all tests in containers

# Manual setup
docker-compose up -d         # Start cache servers
npm run test:integration     # Run integration tests
docker-compose down -v       # Cleanup

# Individual commands
npm run docker:up           # Start containers
npm run docker:down         # Stop containers
npm run docker:logs         # View logs
```

### Test Your Implementation

Test your cache configuration:

```bash
# Build the project
npm run build

# Run example
node -r ts-node/register examples/basic-usage.ts
```

#### Docker Services

The `docker-compose.yml` includes:
- **Redis 7**: Available on `localhost:6379`
- **Memcached 1.6**: Available on `localhost:11211` 
- **Health checks**: Ensures services are ready before tests
- **Persistent volumes**: Redis data persistence

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Development setup and workflow
- Commit message guidelines (Conventional Commits)
- Testing requirements
- Pull request process
- Code standards

**Quick start**: Fork the repo, make your changes with tests, follow conventional commits, and submit a PR!

## License

This project is licensed under the **MIT License** - see the [LICENSE.md](LICENSE.md) file for details.

### Key Points:
- ✅ **Free forever**: Use in any project (personal, commercial, enterprise)
- ✅ **No restrictions**: Modify, distribute, sublicense as needed
- ✅ **No maintenance obligation**: Maintainers contribute voluntarily
- ✅ **No liability**: Use at your own risk
- ✅ **Open source**: Will always remain open and free

## Support & Community

### Getting Help

- 📖 **Documentation**: Check this README and inline code documentation
- 🐛 **Bug Reports**: [Open an issue](https://github.com/RonaldoMoraes/node-cachefy/issues) with reproduction steps
- 💡 **Feature Requests**: [Create a feature request](https://github.com/RonaldoMoraes/node-cachefy/issues) with your use case
- 💬 **Questions**: Use GitHub Discussions for general questions

### Reporting Issues

When reporting bugs, please include:
- Node.js and cachefy versions
- Your configuration
- Steps to reproduce
- Expected vs actual behavior
- Error messages/stack traces

### Community

- **Star the project** if you find it useful
- **Share your use cases** to help us improve
- **Contribute back** with fixes and features
- **Spread the word** to help others discover Cachefy

---

Built with ❤️ by me (so far)