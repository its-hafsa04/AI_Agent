import { AppError } from './errors.js';
import { AiService, type AiResponse } from './ai.service.js';
import { AppointmentService, type AppointmentRecord } from './appointments.service.js';
import { z } from 'zod';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type ChatSessionRecord = {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'ARCHIVED';
  title: string | null;
  history: ChatMessage[];
  metadata: unknown;
  startedAt: Date;
  lastMessageAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatSessionRepository = {
  findById(userId: string, id: string): Promise<ChatSessionRecord | null>;
  create(userId: string, title?: string): Promise<ChatSessionRecord>;
  appendMessage(userId: string, id: string, message: ChatMessage, metadata?: unknown): Promise<ChatSessionRecord>;
};

export class ChatService {
  constructor(
    private readonly repository: ChatSessionRepository,
    private readonly appointmentService: AppointmentService,
    private readonly aiService: AiService,
  ) {}

  create(userId: string, title?: string) {
    return this.repository.create(userId, title);
  }

  get(userId: string, id: string) {
    return this.requireSession(userId, id);
  }

  async addUserMessage(userId: string, id: string, content: string) {
    const session = await this.requireSession(userId, id);
    if (session.status !== 'ACTIVE') throw new AppError(409, 'Chat session is archived');
    const message: ChatMessage = { role: 'user', content };
    await this.repository.appendMessage(userId, id, message);

    const analysis = await this.aiService.analyzeWithObservability(content, session.history);
    const ai = analysis.response;
    const interaction = {
      session: id,
      userMessage: content,
      result: ai,
      timestamp: new Date().toISOString(),
      success: analysis.success,
      ...(analysis.errorType ? { errorType: analysis.errorType } : {}),
    };
    const metadata = appendAiInteraction(session.metadata, interaction);
    const decision = await this.applyBusinessRules(userId, ai);
    const assistantMessage: ChatMessage = { role: 'assistant', content: decision.reply };
    const updatedSession = await this.repository.appendMessage(userId, id, assistantMessage, metadata);

    return {
      message,
      assistantMessage,
      reply: decision.reply,
      ai,
      appointment: decision.appointment,
      session: updatedSession,
    };
  }

  private async applyBusinessRules(userId: string, ai: AiResponse): Promise<{ reply: string; appointment: AppointmentRecord | null }> {
    if (ai.confidence === 0) {
      return { reply: 'I could not understand that request. Please provide the appointment date, time, and purpose.', appointment: null };
    }

    if (ai.confidence < 0.7) {
      return { reply: 'I am not confident I understood the appointment details. Please clarify the date, time, and purpose.', appointment: null };
    }

    if (ai.intent !== 'book_appointment') {
      return { reply: ai.missingFields.length ? `Please provide: ${formatFields(ai.missingFields)}.` : 'I can help you book an appointment.', appointment: null };
    }

    const missingFields = requiredBookingFields.filter((field) => ai[field] === null || ai.missingFields.includes(field));
    if (missingFields.length) {
      return { reply: `Please provide: ${formatFields(missingFields)}.`, appointment: null };
    }

    const booking = bookingSchema.safeParse(ai);
    if (!booking.success) {
      return { reply: 'Please provide an unambiguous appointment date and time, including the timezone.', appointment: null };
    }
    const schedule = parseSchedule(booking.data.date, booking.data.time);
    if (!schedule) {
      return { reply: 'Please provide an unambiguous appointment date and time, including the timezone.', appointment: null };
    }

    try {
      const appointment = await this.appointmentService.create(userId, {
        title: booking.data.purpose,
        notes: `Requested for ${booking.data.name}`,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
      });
      return { reply: `Appointment confirmed for ${formatSummary(ai, schedule.startsAt)}.`, appointment };
    } catch (error) {
      if (error instanceof AppError) {
        return { reply: `I could not book that appointment: ${error.message}.`, appointment: null };
      }
      return { reply: 'I could not book that appointment. Please try again.', appointment: null };
    }
  }

  private async requireSession(userId: string, id: string) {
    const session = await this.repository.findById(userId, id);
    if (!session) throw new AppError(404, 'Chat session not found');
    return session;
  }
}

const requiredBookingFields: Array<keyof Pick<AiResponse, 'name' | 'date' | 'time' | 'purpose'>> = ['name', 'date', 'time', 'purpose'];
const bookingSchema = z.object({
  name: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  purpose: z.string().trim().min(1),
});

const formatFields = (fields: string[]) => fields.map((field) => field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)).join(', ');

const parseSchedule = (date: string | null, time: string | null) => {
  if (!date || !time) return null;
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const startsAt = new Date(`${date}T${normalizedTime}Z`);
  if (Number.isNaN(startsAt.getTime())) return null;
  return { startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000) };
};

const formatSummary = (ai: AiResponse, startsAt: Date) => `${ai.name} for ${ai.purpose} on ${startsAt.toISOString()}`;

const appendAiInteraction = (metadata: unknown, interaction: unknown) => {
  const current = typeof metadata === 'object' && metadata !== null ? metadata as { aiInteractions?: unknown } : {};
  const aiInteractions = Array.isArray(current.aiInteractions) ? current.aiInteractions : [];
  return { ...current, aiInteractions: [...aiInteractions, interaction] };
};