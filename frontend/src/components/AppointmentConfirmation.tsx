import { useNavigate } from 'react-router-dom';
import type { Appointment } from '../lib/api';
import { Button } from './Button';
import { Card } from './Card';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));

export function AppointmentConfirmation({ appointment }: { appointment: Appointment }) {
  const navigate = useNavigate();

  return (
    <Card className="border-teal-200 bg-teal-50 p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Appointment confirmed</p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">{appointment.title}</h2>
      <p className="mt-2 text-sm text-stone-600">{formatDate(appointment.startsAt)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => navigate(`/appointments/${appointment.id}`)}>View details</Button>
        <Button variant="secondary" onClick={() => navigate('/appointments')}>All appointments</Button>
      </div>
    </Card>
  );
}
