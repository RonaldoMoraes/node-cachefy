import { CacheMiddlewareOptions } from './types';
import type { HttpRequest, HttpResponse, NextFunction } from './types/http';
import { handleRequest } from './handlers/request';
import { handleResponse } from './handlers/response';

const defaultOptions: Partial<CacheMiddlewareOptions> = {
  ttl: 3600,
  headers: {
    cacheControl: true,
    etag: true,
    lastModified: true,
  },
};

/**
 * Create a cache middleware with the given options
 */
export function createCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  // Merge with default options
  const finalOptions: CacheMiddlewareOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return async (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
    // Handle request phase
    await handleRequest(req, res, next, finalOptions);

    // Handle response phase
    res.on('finish', () => {
      handleResponse(req, res, finalOptions).catch(error => {
        console.error('Cache response handling error:', error);
      });
    });
  };
}

// Export a default middleware instance
export const cacheMiddleware = createCacheMiddleware();
