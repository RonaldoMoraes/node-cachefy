# Testing Guide for Cachefy

## Overview

This guide explains how to write and run tests for the Cachefy library, focusing on best practices
and common patterns.

## Test Structure

### 1. Unit Tests Location

Tests are organized in the `src/__tests__` directory, mirroring the source directory structure:

```
src/
├── __tests__/
│   ├── core/
│   │   └── store-proxy.test.ts
│   ├── drivers/
│   ├── factories/
│   └── managers/
```

### 2. Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/__tests__/core/store-proxy.test.ts

# Run tests matching a pattern
npm test -- -t "store operations"

# Run tests with coverage
npm test -- --coverage
```

## Writing Tests

### 1. Mocking Dependencies

```typescript
// Mock a driver
const mockDriver: jest.Mocked<CacheDriver> = {
  get: jest.fn(),
  set: jest.fn(),
  // ... other methods
};

// Mock a provider
const mockProvider: jest.Mocked<StoreProvider> = {
  getStore: jest.fn().mockResolvedValue(mockDriver),
};
```

### 2. Test Case Structure

```typescript
describe('Feature or Class', () => {
  // Setup common mocks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should describe expected behavior', async () => {
    // 1. Setup
    mockDriver.method.mockResolvedValue(expectedValue);

    // 2. Execute
    const result = await instance.method();

    // 3. Verify
    expect(mockDriver.method).toHaveBeenCalledWith(expectedArgs);
    expect(result).toEqual(expectedValue);
  });
});
```

### 3. Testing Error Cases

```typescript
it('should handle errors properly', async () => {
  const error = new Error('Test error');
  mockDriver.method.mockRejectedValue(error);

  await expect(instance.method()).rejects.toThrow(error);
});
```

## Adding Custom Cache Drivers

### 1. Creating a Custom Driver

```typescript
import { CacheDriver, DriverOptions } from '@cachefy/types';

export class CustomDriver implements CacheDriver {
  constructor(
    private config: CustomConfig,
    private options: DriverOptions
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Implementation
  }

  // Implement other CacheDriver methods...
}
```

### 2. Testing Custom Drivers

```typescript
describe('CustomDriver', () => {
  it('should implement required interface', () => {
    const driver = new CustomDriver(config, options);
    expect(driver).toBeInstanceOf(CustomDriver);
    // Verify all required methods exist
    expect(typeof driver.get).toBe('function');
    expect(typeof driver.set).toBe('function');
    // etc...
  });
});
```

### 3. Registering Custom Drivers

```typescript
import { DriverRegistry } from '@cachefy/registry';

// Register your custom driver
DriverRegistry.register('custom-driver', (config, options) => new CustomDriver(config, options));

// Use in configuration
await Cache.initialize({
  default: 'custom',
  stores: {
    custom: {
      driver: 'custom-driver',
      connection: {
        // Your custom config
      },
    },
  },
});
```

## Best Practices

1. **Reset Mocks**: Always clear mocks in `beforeEach` to ensure test isolation
2. **Type Safety**: Use TypeScript interfaces for mocks
3. **Error Cases**: Test both success and failure scenarios
4. **Async/Await**: Use async/await for cleaner test code
5. **Descriptive Names**: Write clear test descriptions
6. **Avoid Duplication**: Use beforeEach for common setup
7. **Complete Coverage**: Test edge cases and error conditions

## Common Patterns

### 1. Testing Async Operations

```typescript
it('should handle async operations', async () => {
  mockDriver.get.mockResolvedValue('value');
  const result = await instance.get('key');
  expect(result).toBe('value');
});
```

### 2. Testing Type Safety

```typescript
it('should maintain type safety', async () => {
  interface TestType {
    field: string;
  }

  const value: TestType = { field: 'test' };
  mockDriver.get.mockResolvedValue(value);

  const result = await instance.get<TestType>('key');
  expect(result?.field).toBe('test');
});
```

### 3. Testing Error Propagation

```typescript
it('should propagate errors', async () => {
  const error = new CacheConfigurationError('Test error');
  mockDriver.get.mockRejectedValue(error);

  await expect(instance.get('key')).rejects.toThrow(CacheConfigurationError);
});
```
