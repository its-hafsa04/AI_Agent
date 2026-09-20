import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server, type Socket } from 'socket.io';
import { ChatService, type ChatSessionRepository } from './chat.service.js';
import { AppError } from './errors.js';
import { AiService } from './ai.service.js';
import { AppointmentService, type AppointmentRepository } from './appointments.service.js';
import { configuredOrigins } from './security.js';

type SocketData = { userId: string };
type ClientEvents = {
  'chat:join': (payload: { sessionId?: unknown }) => void;
  'chat:message': (payload: { sessionId?: unknown; content?: unknown }) => void;
};
type ServerEvents = {
  'chat:joined': (payload: { sessionId: string }) => void;
  'chat:message': (payload: { sessionId: string; message: unknown; session: unknown; appointment: unknown }) => void;
  'chat:error': (payload: { error: string; status: number }) => void;
};
type ChatSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>;

export const createChatSocketServer = (
  httpServer: HttpServer,
  repository: ChatSessionRepository,
  secret: string,
  appointmentRepository: AppointmentRepository = unavailableAppointmentRepository,
  aiService = unavailableAiService,
) => {
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: configuredOrigins() },
  });
  const service = new ChatService(repository, new AppointmentService(appointmentRepository), aiService);

  io.use((socket, next) => {
    const auth = socket.handshake.auth as { token?: unknown };
    const token = typeof auth.token === 'string' ? auth.token : null;
    if (!token || !secret) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER ?? 'appointment-chatbot',
        audience: process.env.JWT_AUDIENCE ?? 'appointment-chatbot-client',
      });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') return next(new Error('Invalid token'));
      (socket.data as SocketData).userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const authenticatedSocket = socket as ChatSocket;
    authenticatedSocket.on('chat:join', async ({ sessionId }) => {
      try {
        if (typeof sessionId !== 'string') throw new AppError(400, 'Invalid request');
        await service.get(authenticatedSocket.data.userId, sessionId);
        await authenticatedSocket.join(roomFor(sessionId));
        authenticatedSocket.emit('chat:joined', { sessionId });
      } catch (error) {
        emitError(authenticatedSocket, error);
      }
    });

    authenticatedSocket.on('chat:message', async ({ sessionId, content }) => {
      try {
        if (typeof sessionId !== 'string' || typeof content !== 'string' || !content.trim() || content.length > 10000) {
          throw new AppError(400, 'Invalid request');
        }
        const result = await service.addUserMessage(authenticatedSocket.data.userId, sessionId, content.trim());
        io.to(roomFor(sessionId)).emit('chat:message', { sessionId, message: result.message, session: result.session, appointment: result.appointment });
      } catch (error) {
        emitError(authenticatedSocket, error);
      }
    });
  });

  return io;
};

const roomFor = (sessionId: string) => `chat:${sessionId}`;

const unavailableAiService = new AiService({
  generateContent: async () => { throw new Error('Gemini is not configured'); },
});

const unavailableAppointmentRepository: AppointmentRepository = {
  findMany: async () => [],
  findById: async () => null,
  findOverlapping: async () => null,
  create: async () => { throw new AppError(503, 'Appointment service is not configured'); },
  update: async () => { throw new AppError(503, 'Appointment service is not configured'); },
};

const emitError = (socket: ChatSocket, error: unknown) => {
  const response = error instanceof AppError
    ? { error: error.message, status: error.statusCode }
    : { error: 'Unable to process chat request', status: 500 };
  socket.emit('chat:error', response);
};