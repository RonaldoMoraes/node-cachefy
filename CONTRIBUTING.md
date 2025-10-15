# Contributing to Cachefy

Thank you for your interest in contributing to Cachefy! This guide will help you get started.

## Quick Start

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Install** dependencies: `pnpm install`
4. **Start** development environment: `pnpm run docker:up`
5. **Make** your changes
6. **Test** your changes: `pnpm test`
7. **Commit** using [conventional commits](#commit-guidelines)
8. **Push** and create a pull request

## Development Environment

### Prerequisites

- Node.js 16+ 
- pnpm (recommended) or npm
- Docker (for integration testing)

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/node-cachefy.git
cd cachefy

# Install dependencies
pnpm install

# Start test services
pnpm run docker:up

# Run tests to verify setup
pnpm test
```

### Available Scripts

- `pnpm run build` - Build TypeScript to dist/
- `pnpm run dev` - Build in watch mode
- `pnpm test` - Run all tests
- `pnpm run test:unit` - Unit tests only (fast)
- `pnpm run test:integration` - Integration tests only
- `pnpm run test:watch` - Tests in watch mode
- `pnpm run docker:up` - Start Redis & Memcached
- `pnpm run docker:down` - Stop test services

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) with automated enforcement.

### Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix  
- **docs**: Documentation changes
- **style**: Code formatting
- **refactor**: Code restructuring
- **perf**: Performance improvements
- **test**: Adding/updating tests
- **build**: Build system changes
- **ci**: CI configuration
- **chore**: Maintenance tasks

### Examples

```bash
feat: add distributed cache invalidation
fix: handle redis connection timeouts gracefully  
docs: add memcached configuration examples
test: add integration tests for redis failover
```

### Validation

Commit messages are validated by commitlint via Husky hooks. Invalid commits will be rejected:

```bash
❌ git commit -m "Added new feature"
✅ git commit -m "feat: add new cache driver"
```

## Code Standards

### TypeScript

- Strict mode enabled
- Use explicit types where helpful
- Prefer interfaces over types for objects
- Export types alongside implementations

### Testing

- Write tests for new features
- Update tests for bug fixes
- Aim for good coverage of core logic
- Use descriptive test names

```typescript
// Good
test('should handle redis connection timeout gracefully', async () => {
  // test implementation
});

// Avoid
test('redis test', async () => {
  // test implementation  
});
```

### Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Include examples for complex features
- Keep docs current with code changes

## Pull Request Process

1. **Create branch** from main: `git checkout -b feat/your-feature`
2. **Implement** your changes with tests
3. **Ensure tests pass**: `pnpm test`
4. **Update documentation** if needed
5. **Use conventional commits** throughout
6. **Submit PR** with:
   - Clear title and description
   - Link to related issues
   - Screenshots/examples if applicable

### PR Review

- Maintainers will review within a few days
- Address feedback promptly
- Be open to suggestions and changes
- Keep discussions respectful and constructive

## Reporting Issues

### Bug Reports

Include:
- Node.js and Cachefy versions
- Configuration (sanitized)
- Steps to reproduce
- Expected vs actual behavior
- Error messages/stack traces

### Feature Requests

Include:
- Use case description
- Proposed API (if applicable)
- Examples of usage
- Alternatives considered

## Architecture Overview

```
src/
├── types/           # TypeScript interfaces and types
├── drivers/         # Cache driver implementations
│   ├── memory.driver.ts
│   ├── redis.driver.ts  
│   └── memcached.driver.ts
├── cache.ts         # Main Cache class
└── index.ts         # Public API exports
```

### Adding New Drivers

1. Implement `CacheDriver` interface
2. Add driver to `createDriver()` in cache.ts
3. Export types from types/index.ts
4. Add comprehensive tests
5. Update documentation

## Questions?

- Check existing issues and discussions
- Ask in GitHub Discussions
- Reach out to maintainers

Thank you for contributing! 🚀