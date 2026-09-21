import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

export const aiResponseSchema = z.object({
  intent: z.enum(['book_appointment', 'modify_appointment', 'cancel_appointment', 'general']),
  name: z.string().trim().max(160).nullable(),
  date: z.string().trim().max(64).nullable(),
  time: z.string().trim().max(32).nullable(),
  purpose: z.string().trim().max(200).nullable(),
  missingFields: z.array(z.enum(['name', 'date', 'time', 'purpose'])).max(4),
  confidence: z.number().finite().min(0).max(1),
}).strict();

export type AiResponse = z.infer<typeof aiResponseSchema>;
export type ConversationMessage = { role: 'user' | 'assistant'; content: string };
export type AiErrorType = 'timeout' | 'invalid_json' | 'validation_failure' | 'provider_failure';
export type AiAnalysis = { response: AiResponse; success: boolean; errorType?: AiErrorType };

export type GeminiModel = {
  generateContent(prompt: string): Promise<{ response: { text(): string } }>;
};

const requiredFields: Record<AiResponse['intent'], Array<keyof Pick<AiResponse, 'name' | 'date' | 'time' | 'purpose'>>> = {
  book_appointment: ['name', 'date', 'time', 'purpose'],
  modify_appointment: ['date', 'time'],
  cancel_appointment: ['date', 'time'],
  general: [],
};

const fallbackResponse = (): AiResponse => ({
  intent: 'general',
  name: null,
  date: null,
  time: null,
  purpose: null,
  missingFields: [],
  confidence: 0,
});

export class AiService {
  constructor(
    private readonly model: GeminiModel,
    private readonly timeoutMs = 8_000,
  ) {}

  async analyze(currentUserMessage: string, recentConversationContext: ConversationMessage[]): Promise<AiResponse> {
    return (await this.analyzeWithObservability(currentUserMessage, recentConversationContext)).response;
  }

  async analyzeWithObservability(
    currentUserMessage: string,
    recentConversationContext: ConversationMessage[],
  ): Promise<AiAnalysis> {
    try {
      const rawOutput = await this.withTimeout(
        this.model.generateContent(buildPrompt(currentUserMessage, recentConversationContext))
          .then((result) => result.response.text()),
      );
      let parsedOutput: unknown;
      try {
        parsedOutput = parseJson(rawOutput);
      } catch {
        return { response: recoverAppointmentRequest(currentUserMessage, recentConversationContext), success: false, errorType: 'invalid_json' };
      }
      const validatedOutput = aiResponseSchema.safeParse(parsedOutput);
      if (!validatedOutput.success) {
        return { response: recoverAppointmentRequest(currentUserMessage, recentConversationContext), success: false, errorType: 'validation_failure' };
      }

      return { response: addMissingFields(normalizeAppointmentFields(validatedOutput.data)), success: true };
    } catch (error) {
      const errorType = error instanceof Error && error.message === 'Gemini request timed out'
        ? 'timeout'
        : 'provider_failure';
      return { response: recoverAppointmentRequest(currentUserMessage, recentConversationContext), success: false, errorType };
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Gemini request timed out')), this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}

export const createGeminiAiService = (
  apiKey = process.env.GEMINI_API_KEY ?? '',
  modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  timeoutMs = 8_000,
) => {
  if (!apiKey) throw new Error('GEMINI_API_KEY is required');
  const client = new GoogleGenerativeAI(apiKey);
  return new AiService(client.getGenerativeModel({ model: modelName }), timeoutMs);
};

const buildPrompt = (currentUserMessage: string, recentConversationContext: ConversationMessage[]) => `
Classify the user request and extract appointment details. Return only one JSON object with exactly these keys:
{"intent":"book_appointment|modify_appointment|cancel_appointment|general","name":string|null,"date":string|null,"time":string|null,"purpose":string|null,"missingFields":string[],"confidence":number}
Use null for unknown values, list missing appointment fields, and set confidence from 0 to 1.
Current user message: ${JSON.stringify(currentUserMessage)}
Recent context: ${JSON.stringify(recentConversationContext.slice(-6))}
`.trim();

const parseJson = (rawOutput: string): unknown => {
  const trimmed = rawOutput.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fencedMatch ? fencedMatch[1] : trimmed);
};

const addMissingFields = (response: AiResponse): AiResponse => {
  const required = requiredFields[response.intent];
  const missingFields = [...new Set([
    ...response.missingFields,
    ...required.filter((field) => response[field] === null),
  ])];
  return { ...response, missingFields };
};

const normalizeAppointmentFields = (response: AiResponse): AiResponse => ({
  ...response,
  date: response.date ? extractDate(response.date) ?? response.date : null,
  time: response.time ? extractTime(response.time) ?? response.time : null,
});

const recoverAppointmentRequest = (
  currentUserMessage: string,
  recentConversationContext: ConversationMessage[],
): AiResponse => {
  const text = [...recentConversationContext.filter((message) => message.role === 'user').map((message) => message.content), currentUserMessage].join(' ');
  const normalized = text.toLowerCase();
  const date = extractDate(text);
  const time = extractTime(text);
  const purpose = extractPurpose(text);
  const name = extractName(text);
  const isAppointmentRequest = /\b(book|schedule|appointment|meeting|visit|reserve|available|availability)\b/i.test(text);

  if (!isAppointmentRequest && !date && !time && !purpose) return fallbackResponse();

  const response: AiResponse = {
    intent: /\b(cancel|取消)\b/i.test(normalized) ? 'cancel_appointment' : /\b(reschedule|change|modify|move)\b/i.test(normalized) ? 'modify_appointment' : 'book_appointment',
    name,
    date,
    time,
    purpose,
    missingFields: [],
    confidence: date || time || purpose ? 0.75 : 0,
  };
  return addMissingFields(response);
};

const extractDate = (text: string): string | null => {
  const isoDate = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoDate) return isoDate[1];

  const relative = text.match(/\b(today|tomorrow)\b/i)?.[1]?.toLowerCase();
  if (relative) {
    const date = new Date();
    if (relative === 'tomorrow') date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }

  const monthDate = text.match(/\b(?:on\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i);
  const dayMonthDate = text.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:,?\s+(20\d{2}))?\b/i);
  const matchedDate = monthDate ?? dayMonthDate;
  if (!matchedDate) return null;
  const day = monthDate ? monthDate[2] : dayMonthDate![1];
  const monthName = monthDate ? monthDate[1] : dayMonthDate![2];
  const yearValue = monthDate ? monthDate[3] : dayMonthDate![3];
  const year = yearValue ? Number(yearValue) : new Date().getUTCFullYear();
  const month = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const extractTime = (text: string): string | null => {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ?? text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ?? '00';
  if (match[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (match[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

const extractPurpose = (text: string): string | null => {
  const match = text.match(/\b(?:for|regarding|about)\s+([^,.!?]+?)(?=\s+(?:on|at|tomorrow|today)\b|[,.!?]|$)/i);
  return match?.[1]?.trim() || null;
};

const extractName = (text: string): string | null => {
  const match = text.match(/\b(?:my name is|name is|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  return match?.[1]?.trim() || null;
};