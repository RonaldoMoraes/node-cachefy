import { Cache } from '../../cache';
import { CacheMiddlewareOptions, CacheContext } from '../types';
import { HttpRequest, HttpResponse } from '../types/http';
import { buildCacheHeaders } from '../builders/headers-builder';
import { buildCacheTags } from '../builders/key-builder';

/**
 * Handle outgoing response and cache if needed
 */
export async function handleResponse(
  req: HttpRequest,
  res: HttpResponse,
  options: CacheMiddlewareOptions
): Promise<void> {
  const context: CacheContext = res.locals.cacheContext;
  if (!context) return;

  try {
    // Get the response data
    const data = res.locals.data;
    if (!data) return;

    // Update context
    context.data = data;
    context.statusCode = res.statusCode;

    // Only cache successful responses
    if (context.statusCode >= 200 && context.statusCode < 300) {
      // Generate cache tags
      context.tags = buildCacheTags(req, options);

      // Build cache headers
      context.headers = buildCacheHeaders(options, context);

      // Transform data if needed
      const finalData = options.transform
        ? options.transform(context.data, req)
        : context.data;

      // Serialize data
      const serialized = options.serialize
        ? options.serialize(finalData)
        : JSON.stringify(finalData);

      // Get cache store
      const store = options.store ? Cache.store(options.store) : Cache;

      // Store in cache
      await store.set(context.key, serialized, options.ttl || 3600);

      // Set cache headers
      Object.entries(context.headers).forEach(([name, value]) => {
        res.setHeader(name, value);
      });
    }
  } catch (error) {
    // Log cache errors but don't fail the response
    console.error('Cache middleware error:', error);
    context.error = error as Error;
  }
}
