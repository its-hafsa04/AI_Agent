import { PrismaClient, AppointmentStatus, ChatSessionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'alex@example.com' },
    update: { passwordHash: await bcrypt.hash('ChangeMe123!', 12) },
    create: {
      email: 'alex@example.com',
      passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      name: 'Alex Morgan',
      phone: '+1-555-0100',
      timezone: 'America/New_York',
    },
  });

  const startsAt = new Date('2026-10-15T14:00:00.000Z');
  await prisma.appointment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { userId: user.id },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: user.id,
      title: 'Initial consultation',
      notes: 'Bring any relevant documents.',
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.chatSession.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { userId: user.id },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      userId: user.id,
      status: ChatSessionStatus.ACTIVE,
      title: 'Appointment planning',
      history: [
        { role: 'user', content: 'I need to schedule an initial consultation.' },
        { role: 'assistant', content: 'I can help with that.' },
      ],
      metadata: { source: 'seed', locale: 'en-US' },
      lastMessageAt: new Date(),
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());