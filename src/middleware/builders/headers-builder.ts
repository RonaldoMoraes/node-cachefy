import { CacheMiddlewareOptions, CacheContext } from '../types';
import { createHash } from 'crypto';

/**
 * Build cache-related HTTP headers
 */
export function buildCacheHeaders(
  options: CacheMiddlewareOptions,
  context: CacheContext
): Record<string, string> {
  const headers: Record<string, string> = {};
  const { headers: headerOptions = {} } = options;

  // Add Cache-Control header
  if (headerOptions.cacheControl !== false) {
    const cacheControl =
      typeof headerOptions.cacheControl === 'string'
        ? headerOptions.cacheControl
        : `public, max-age=${options.ttl || 3600}`;

    headers['Cache-Control'] = cacheControl;
  }

  // Add ETag header
  if (headerOptions.etag !== false && context.data) {
    const etag = createHash('md5')
      .update(JSON.stringify(context.data))
      .digest('hex');

    headers['ETag'] = `"${etag}"`;
  }

  // Add Last-Modified header
  if (headerOptions.lastModified !== false) {
    headers['Last-Modified'] = new Date().toUTCString();
  }

  // Add X-Cache header for debugging
  headers['X-Cache'] = context.hit ? 'HIT' : 'MISS';

  return headers;
}

/**
 * Check if cached response can be returned based on request headers
 */
export function checkCacheHeaders(
  reqHeaders: Record<string, string>,
  cacheHeaders: Record<string, string>
): boolean {
  // Check If-None-Match header
  const ifNoneMatch = reqHeaders['if-none-match'];
  if (ifNoneMatch && cacheHeaders['ETag'] === ifNoneMatch) {
    return true;
  }

  // Check If-Modified-Since header
  const ifModifiedSince = reqHeaders['if-modified-since'];
  if (
    ifModifiedSince &&
    cacheHeaders['Last-Modified'] &&
    new Date(ifModifiedSince) >= new Date(cacheHeaders['Last-Modified'])
  ) {
    return true;
  }

  return false;
}
