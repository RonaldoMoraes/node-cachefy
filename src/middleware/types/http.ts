/**
 * Generic HTTP request interface
 */
export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, any>;
  body?: any;
  get(header: string): string | undefined;
}

/**
 * Generic HTTP response interface
 */
export interface HttpResponse {
  statusCode: number;
  locals: Record<string, any>;
  headers: Record<string, string | string[]>;
  setHeader(name: string, value: string): void;
  status(code: number): HttpResponse;
  json(body: any): void;
  send(body: any): void;
  end(): void;
  on(event: string, listener: () => void): void;
}

/**
 * Generic next function for middleware chaining
 */
export type NextFunction = (error?: any) => void;

/**
 * Generic middleware function signature
 */
export type Middleware = (
  req: HttpRequest,
  res: HttpResponse,
  next: NextFunction
) => void | Promise<void>;
