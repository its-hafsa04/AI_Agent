import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { asyncHandler, AppError } from './errors.js';
import { ChatService, type ChatSessionRepository } from './chat.service.js';
import type { AiService } from './ai.service.js';
import type { AppointmentService } from './appointments.service.js';

const idSchema = z.string().uuid();
const createSchema = z.object({ title: z.string().trim().min(1).max(200).optional() });
const messageSchema = z.object({ content: z.string().trim().min(1).max(10000) });

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, 'Invalid request', result.error.flatten().fieldErrors);
  return result.data;
};

export const createChatRouter = (
  repository: ChatSessionRepository,
  secret: string,
  appointmentService: AppointmentService,
  aiService: AiService,
) => {
  const service = new ChatService(repository, appointmentService, aiService);
  const router = Router();
  router.use(requireAuth(secret));

  router.post('/sessions', asyncHandler(async (request, response) => {
    const input = parse(createSchema, request.body ?? {});
    const session = await service.create(response.locals.authUserId as string, input.title);
    response.status(201).json({ session });
  }));

  router.get('/sessions/:id', asyncHandler(async (request, response) => {
    const session = await service.get(response.locals.authUserId as string, parse(idSchema, request.params.id));
    response.status(200).json({ session });
  }));

  router.post('/sessions/:id/messages', asyncHandler(async (request, response) => {
    const input = parse(messageSchema, request.body);
    const result = await service.addUserMessage(
      response.locals.authUserId as string,
      parse(idSchema, request.params.id),
      input.content,
    );
    response.status(201).json(result);
  }));

  return router;
};