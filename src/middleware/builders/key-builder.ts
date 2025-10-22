import { createHash } from 'crypto';
import { CacheMiddlewareOptions } from '../types';
import { HttpRequest } from '../types/http';

/**
 * Generate a cache key based on the request and options
 */
export function buildCacheKey(
  req: HttpRequest,
  options: CacheMiddlewareOptions
): string {
  // If key is provided as a string, use it directly
  if (typeof options.key === 'string') {
    return options.key;
  }

  // If key generator function is provided, use it
  if (typeof options.key === 'function') {
    return options.key(req);
  }

  // Default key generation based on request properties
  const parts = [
    req.method,
    req.path,
    JSON.stringify(req.query),
    req.get('accept'),
    req.get('accept-language'),
  ];

  // Add vary headers to key if present
  const varyHeader = req.get('vary');
  if (varyHeader) {
    const varyHeaders = varyHeader.split(',').map(h => h.trim());
    for (const header of varyHeaders) {
      parts.push(req.get(header));
    }
  }

  // Generate hash of the key parts
  return createHash('sha256')
    .update(parts.filter(Boolean).join(':'))
    .digest('hex');
}

/**
 * Generate cache tags based on the request and options
 */
export function buildCacheTags(
  req: HttpRequest,
  options: CacheMiddlewareOptions
): string[] {
  if (typeof options.tags === 'function') {
    return options.tags(req);
  }

  if (Array.isArray(options.tags)) {
    return options.tags;
  }

  // Default tags based on route
  return [req.path.split('/').filter(Boolean)[0] || 'root'];
}
