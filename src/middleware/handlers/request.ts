import { Cache } from '../../cache';
import { CacheMiddlewareOptions, CacheContext } from '../types';
import { HttpRequest, HttpResponse, NextFunction } from '../types/http';
import { buildCacheKey } from '../builders/key-builder';
import {
  buildCacheHeaders,
  checkCacheHeaders,
} from '../builders/headers-builder';

/**
 * Handle incoming request and try to serve from cache
 */
export async function handleRequest(
  req: HttpRequest,
  res: HttpResponse,
  next: NextFunction,
  options: CacheMiddlewareOptions
): Promise<void> {
  try {
    // Skip cache for non-GET requests unless explicitly configured
    if (req.method !== 'GET' && !options.condition) {
      return next();
    }

    // Check cache condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }

    // Generate cache key
    const key = buildCacheKey(req, options);
    const context: CacheContext = { key };

    // Get cache store
    const store = options.store ? Cache.store(options.store) : Cache;

    // Try to get from cache
    const cached = await store.get(key);

    if (cached) {
      // Cache hit
      context.hit = true;
      context.data = options.deserialize ? options.deserialize(cached) : cached;

      // Build cache headers
      context.headers = buildCacheHeaders(options, context);

      // Build and check conditional headers
      context.headers = buildCacheHeaders(options, context);
      if (
        checkCacheHeaders(
          req.headers as Record<string, string>,
          context.headers
        )
      ) {
        res.status(304).end();
        return;
      }

      // Transform data if needed
      if (options.transform) {
        context.data = options.transform(context.data, req);
      }

      // Set cache headers
      Object.entries(context.headers).forEach(([name, value]) => {
        res.setHeader(name, value);
      });

      // Send cached response
      res.json(context.data);

      // Trigger hit callback
      if (options.onHit) {
        options.onHit(req, key);
      }
    } else {
      // Cache miss
      context.hit = false;

      // Store context for response handler
      res.locals.cacheContext = context;

      // Trigger miss callback
      if (options.onMiss) {
        options.onMiss(req, key);
      }

      next();
    }
  } catch (error) {
    // Don't fail the request on cache errors
    console.error('Cache middleware error:', error);
    next();
  }
}
