import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    console.info(JSON.stringify({
      method: request.method,
      path: request.originalUrl.split('?')[0],
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
      ip: request.ip,
    }));
  });
  next();
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export const rateLimit = ({ windowMs, max }: RateLimitOptions): RequestHandler => {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip ?? 'unknown';
    const current = requests.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    requests.set(key, entry);

    if (entry.count > max) {
      response.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      response.status(429).json({ error: 'Too many requests' });
      return;
    }

    if (requests.size > 10_000) {
      for (const [address, value] of requests) {
        if (value.resetAt <= now) requests.delete(address);
      }
    }
    next();
  };
};

export const configuredOrigins = (value = process.env.CLIENT_ORIGIN): string[] =>
  (value ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
