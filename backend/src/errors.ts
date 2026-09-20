import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const asyncHandler =
  (handler: (request: Request, response: Response, next: NextFunction) => Promise<void>) =>
  (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  void _next;
  if (isJsonParseError(error)) {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });
    return;
  }

  response.status(500).json({ error: 'Internal server error' });
};

const isJsonParseError = (error: unknown): boolean =>
  error instanceof SyntaxError && typeof error === 'object' && error !== null && 'status' in error && error.status === 400;