/**
 * Base cache error class
 */
export class CacheError extends Error {
  public readonly code: string;
  public readonly store: string | undefined;
  public readonly operation: string | undefined;

  constructor(message: string, code: string, store?: string, operation?: string) {
    super(message);
    this.name = 'CacheError';
    this.code = code;
    this.store = store;
    this.operation = operation;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheError);
    }
  }
}

/**
 * Connection related errors
 */
export class CacheConnectionError extends CacheError {
  constructor(message: string, store?: string) {
    super(message, 'CONNECTION_ERROR', store);
    this.name = 'CacheConnectionError';
  }
}

/**
 * Serialization related errors
 */
export class CacheSerializationError extends CacheError {
  public readonly originalError: Error | undefined;

  constructor(message: string, originalError?: Error, store?: string, operation?: string) {
    super(message, 'SERIALIZATION_ERROR', store, operation);
    this.name = 'CacheSerializationError';
    this.originalError = originalError;
  }
}

/**
 * Configuration related errors
 */
export class CacheConfigurationError extends CacheError {
  constructor(message: string, store?: string) {
    super(message, 'CONFIGURATION_ERROR', store);
    this.name = 'CacheConfigurationError';
  }
}

/**
 * Operation timeout errors
 */
export class CacheTimeoutError extends CacheError {
  constructor(message: string, store?: string, operation?: string) {
    super(message, 'TIMEOUT_ERROR', store, operation);
    this.name = 'CacheTimeoutError';
  }
}

/**
 * Driver specific errors
 */
export class CacheDriverError extends CacheError {
  public readonly originalError: Error | undefined;

  constructor(message: string, originalError?: Error, store?: string, operation?: string) {
    super(message, 'DRIVER_ERROR', store, operation);
    this.name = 'CacheDriverError';
    this.originalError = originalError;
  }
}

/**
 * Error mode configuration
 */
export type ErrorMode = 'strict' | 'graceful';

/**
 * Result type for graceful error handling
 */
export type CacheResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: CacheError;
  data: null;
};