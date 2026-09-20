import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Request, RequestHandler } from 'express';
import { Router } from 'express';

const signupSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(160),
});

const loginSchema = signupSchema.pick({ email: true, password: true });

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string | null;
  timezone: string;
};

export type AuthRepository = {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  createUser(input: { email: string; passwordHash: string; name: string }): Promise<AuthUser>;
};

export type PublicUser = Omit<AuthUser, 'passwordHash'>;

const publicUser = (user: AuthUser): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  timezone: user.timezone,
});

const tokenFor = (user: AuthUser, secret: string) =>
  jwt.sign({ sub: user.id }, secret, {
    algorithm: 'HS256',
    expiresIn: '7d',
    issuer: jwtIssuer,
    audience: jwtAudience,
  });

const jwtIssuer = process.env.JWT_ISSUER ?? 'appointment-chatbot';
const jwtAudience = process.env.JWT_AUDIENCE ?? 'appointment-chatbot-client';

const bearerToken = (request: Request) => {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

export const requireAuth = (secret: string): RequestHandler => (request, response, next) => {
  const token = bearerToken(request);
  if (!token || !secret) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: jwtIssuer,
      audience: jwtAudience,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      response.status(401).json({ error: 'Invalid token' });
      return;
    }
    response.locals.authUserId = payload.sub;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid token' });
  }
};

export const createAuthRouter = (repository: AuthRepository, secret: string) => {
  const router = Router();

  router.post('/signup', async (request, response) => {
    const result = signupSchema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({ error: 'Invalid request', details: result.error.flatten().fieldErrors });
      return;
    }
    if (!secret) {
      response.status(500).json({ error: 'Authentication is not configured' });
      return;
    }

    const email = result.data.email.toLowerCase();
    try {
      if (await repository.findByEmail(email)) {
        response.status(409).json({ error: 'Email is already registered' });
        return;
      }
      const user = await repository.createUser({
        email,
        passwordHash: await bcrypt.hash(result.data.password, 12),
        name: result.data.name,
      });
      response.status(201).json({ user: publicUser(user), token: tokenFor(user, secret) });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        response.status(409).json({ error: 'Email is already registered' });
        return;
      }
      response.status(500).json({ error: 'Unable to create account' });
    }
  });

  router.post('/login', async (request, response) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({ error: 'Invalid request', details: result.error.flatten().fieldErrors });
      return;
    }
    if (!secret) {
      response.status(500).json({ error: 'Authentication is not configured' });
      return;
    }

    try {
      const user = await repository.findByEmail(result.data.email.toLowerCase());
      if (!user || !(await bcrypt.compare(result.data.password, user.passwordHash))) {
        response.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      response.status(200).json({ user: publicUser(user), token: tokenFor(user, secret) });
    } catch {
      response.status(500).json({ error: 'Unable to authenticate' });
    }
  });

  router.get('/me', requireAuth(secret), async (request, response) => {
    try {
      const user = await repository.findById(response.locals.authUserId as string);
      if (!user) {
        response.status(401).json({ error: 'Invalid token' });
        return;
      }
      response.status(200).json({ user: publicUser(user) });
    } catch {
      response.status(500).json({ error: 'Unable to load user' });
    }
  });

  return router;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';