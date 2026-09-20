import { AppointmentStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { asyncHandler, AppError } from './errors.js';
import { AppointmentService, type AppointmentInput, type AppointmentRepository, type AppointmentUpdate } from './appointments.service.js';

const statusSchema = z.enum([
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
]);

const dateSchema = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(5000).nullable().optional(),
  startsAt: dateSchema,
  endsAt: dateSchema,
  status: statusSchema.optional(),
});
const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
const idSchema = z.string().uuid();

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, 'Invalid request', result.error.flatten().fieldErrors);
  return result.data;
};

const serialize = (appointment: Awaited<ReturnType<AppointmentService['get']>>) => appointment;

export const createAppointmentRouter = (repository: AppointmentRepository, secret: string) => {
  const service = new AppointmentService(repository);
  const router = Router();

  router.use(requireAuth(secret));

  router.post('/', asyncHandler(async (request, response) => {
    const input = parse<AppointmentInput>(createSchema, request.body);
    const appointment = await service.create(response.locals.authUserId as string, input);
    response.status(201).json({ appointment: serialize(appointment) });
  }));

  router.get('/', asyncHandler(async (_request, response) => {
    const appointments = await service.list(response.locals.authUserId as string);
    response.status(200).json({ appointments });
  }));

  router.get('/:id', asyncHandler(async (request, response) => {
    const id = parse(idSchema, request.params.id);
    const appointment = await service.get(response.locals.authUserId as string, id);
    response.status(200).json({ appointment: serialize(appointment) });
  }));

  router.patch('/:id', asyncHandler(async (request, response) => {
    const id = parse(idSchema, request.params.id);
    const input = parse<AppointmentUpdate>(updateSchema, request.body);
    const appointment = await service.update(response.locals.authUserId as string, id, input);
    response.status(200).json({ appointment: serialize(appointment) });
  }));

  return router;
};