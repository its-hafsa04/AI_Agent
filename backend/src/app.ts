import cors from 'cors';
import express from 'express';
import { PrismaClient, type Prisma } from '@prisma/client';
import { createAuthRouter, type AuthRepository } from './auth.js';
import { createAppointmentRouter } from './appointments.controller.js';
import type { AppointmentRepository } from './appointments.service.js';
import { createChatRouter } from './chat.controller.js';
import type { ChatMessage, ChatSessionRepository } from './chat.service.js';
import { errorHandler } from './errors.js';
import { AiService, createGeminiAiService } from './ai.service.js';
import { AppointmentService } from './appointments.service.js';
import { configuredOrigins, rateLimit, requestLogger } from './security.js';

const prisma = new PrismaClient();

const prismaRepository: AuthRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  createUser: (input) => prisma.user.create({ data: input }),
};

export const prismaAppointmentRepository: AppointmentRepository = {
  findMany: (userId) => prisma.appointment.findMany({ where: { userId }, orderBy: { startsAt: 'asc' } }),
  findById: (userId, id) => prisma.appointment.findFirst({ where: { id, userId } }),
  findOverlapping: (userId, startsAt, endsAt, excludeId) => prisma.appointment.findFirst({
    where: {
      userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  }),
  create: (userId, input) => prisma.appointment.create({ data: { ...input, userId } }),
  update: (userId, id, input) => prisma.appointment.update({ where: { id, userId }, data: input }),
};

export const prismaChatRepository: ChatSessionRepository = {
  findById: async (userId, id) => {
    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    return session?.userId ? { ...session, userId: session.userId, history: toHistory(session.history) } : null;
  },
  create: async (userId, title) => {
    const session = await prisma.chatSession.create({ data: { userId, ...(title ? { title } : {}) } });
    return { ...session, userId, history: toHistory(session.history) };
  },
  appendMessage: async (userId, id, message, metadata) => {
    const session = await prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) throw new Error('Chat session not found');
    const updated = await prisma.chatSession.update({
      where: { id },
      data: {
        history: [...toHistory(session.history), message],
        ...(metadata === undefined ? {} : { metadata: metadata as Prisma.InputJsonValue }),
        lastMessageAt: new Date(),
      },
    });
    return { ...updated, userId, history: toHistory(updated.history) };
  },
};

export const createApp = (
  repository: AuthRepository = prismaRepository,
  secret = process.env.JWT_SECRET ?? '',
  appointmentRepository: AppointmentRepository = prismaAppointmentRepository,
  chatRepository: ChatSessionRepository = prismaChatRepository,
  aiService: AiService = defaultAiService,
) => {
  const app = express();
  const appointmentService = new AppointmentService(appointmentRepository);
  const allowedOrigins = configuredOrigins();

  app.use(requestLogger);
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));
  app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 20 }));

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter(repository, secret));
  app.use('/api/appointments', createAppointmentRouter(appointmentRepository, secret));
  app.use('/api/chat', createChatRouter(chatRepository, secret, appointmentService, aiService));

  app.use(errorHandler);

  return app;
};

const unavailableAiService = new AiService({
  generateContent: async () => { throw new Error('Gemini is not configured'); },
});

export const defaultAiService = process.env.GEMINI_API_KEY ? createGeminiAiService() : unavailableAiService;

export default createApp();

const toHistory = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChatMessage =>
    typeof item === 'object' && item !== null &&
    ((item as { role?: unknown }).role === 'user' || (item as { role?: unknown }).role === 'assistant') &&
    typeof (item as { content?: unknown }).content === 'string',
  );
};
