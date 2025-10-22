import { HttpRequest } from './http';

/**
 * Cache middleware configuration options
 */
export interface CacheMiddlewareOptions {
  /**
   * Time to live in seconds
   * @default 3600 (1 hour)
   */
  ttl?: number;

  /**
   * Cache key generator
   * Can be a static string or a function that generates a key based on the request
   */
  key?: string | ((req: HttpRequest) => string);

  /**
   * Condition to determine if response should be cached
   * @returns true if response should be cached
   */
  condition?: (req: HttpRequest) => boolean;

  /**
   * Tags to associate with the cached response
   * Useful for cache invalidation
   */
  tags?: string[] | ((req: HttpRequest) => string[]);

  /**
   * Custom serialization function
   * @default JSON.stringify
   */
  serialize?: (data: any) => string;

  /**
   * Custom deserialization function
   * @default JSON.parse
   */
  deserialize?: (data: string) => any;

  /**
   * HTTP cache headers configuration
   */
  headers?: {
    /**
     * Cache-Control header
     * @default true (public, max-age=ttl)
     */
    cacheControl?: boolean | string;

    /**
     * ETag support
     * @default true
     */
    etag?: boolean;

    /**
     * Last-Modified header
     * @default true
     */
    lastModified?: boolean;
  };

  /**
   * Cache store to use
   * @default Cache's default store
   */
  store?: string;

  /**
   * Callback when cache hit occurs
   */
  onHit?: (req: HttpRequest, key: string) => void;

  /**
   * Callback when cache miss occurs
   */
  onMiss?: (req: HttpRequest, key: string) => void;

  /**
   * Transform cached data before sending
   */
  transform?: (data: any, req: HttpRequest) => any;
}

/**
 * Cache context passed between middleware handlers
 */
export interface CacheContext {
  /**
   * Generated cache key
   */
  key: string;

  /**
   * Original response data
   */
  data?: any;

  /**
   * Cache hit status
   */
  hit?: boolean;

  /**
   * Response headers
   */
  headers?: Record<string, string>;

  /**
   * Cache tags
   */
  tags?: string[];

  /**
   * Original response status code
   */
  statusCode?: number;

  /**
   * Error that occurred during caching
   */
  error?: Error;
}
