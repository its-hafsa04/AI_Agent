import { AppointmentStatus } from '@prisma/client';
import { AppError } from './errors.js';

export type AppointmentRecord = {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentInput = {
  title: string;
  notes?: string | null;
  startsAt: Date;
  endsAt: Date;
  status?: AppointmentStatus;
};

export type AppointmentUpdate = Partial<AppointmentInput>;

export type AppointmentRepository = {
  findMany(userId: string): Promise<AppointmentRecord[]>;
  findById(userId: string, id: string): Promise<AppointmentRecord | null>;
  findOverlapping(userId: string, startsAt: Date, endsAt: Date, excludeId?: string): Promise<AppointmentRecord | null>;
  create(userId: string, input: AppointmentInput): Promise<AppointmentRecord>;
  update(userId: string, id: string, input: AppointmentUpdate): Promise<AppointmentRecord>;
};

const activeStatuses = new Set<AppointmentStatus>([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]);

export class AppointmentService {
  constructor(private readonly repository: AppointmentRepository) {}

  list(userId: string) {
    return this.repository.findMany(userId);
  }

  async get(userId: string, id: string) {
    const appointment = await this.repository.findById(userId, id);
    if (!appointment) throw new AppError(404, 'Appointment not found');
    return appointment;
  }

  async create(userId: string, input: AppointmentInput) {
    this.validateSchedule(input.startsAt, input.endsAt);
    await this.ensureAvailable(userId, input.startsAt, input.endsAt);
    return this.repository.create(userId, input);
  }

  async update(userId: string, id: string, input: AppointmentUpdate) {
    const current = await this.get(userId, id);
    const startsAt = input.startsAt ?? current.startsAt;
    const endsAt = input.endsAt ?? current.endsAt;
    this.validateSchedule(startsAt, endsAt);
    if (activeStatuses.has(input.status ?? current.status)) {
      await this.ensureAvailable(userId, startsAt, endsAt, id);
    }
    return this.repository.update(userId, id, input);
  }

  private async ensureAvailable(userId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
    const overlap = await this.repository.findOverlapping(userId, startsAt, endsAt, excludeId);
    if (overlap) throw new AppError(409, 'Appointment overlaps an existing booking');
  }

  private validateSchedule(startsAt: Date, endsAt: Date) {
    if (startsAt.getTime() <= Date.now()) throw new AppError(400, 'Appointment must start in the future');
    if (endsAt.getTime() <= startsAt.getTime()) throw new AppError(400, 'Appointment must end after it starts');
    if (endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1000) {
      throw new AppError(400, 'Appointment cannot be longer than 24 hours');
    }
  }
}