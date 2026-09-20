import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { ErrorMessage, Loading } from '../components/Feedback';
import { useAuth } from '../auth/useAuth';
import { api, ApiError, type Appointment } from '../lib/api';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function DashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.listAppointments()
      .then(({ appointments: result }) => setAppointments(result))
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Unable to load your appointments.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-medium text-teal-700">Your dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Good to see you, {user?.name.split(' ')[0]}.</h1>
        <p className="mt-3 max-w-xl text-stone-600">Your confirmed appointments are collected here.</p>
      </div>
      {error && <ErrorMessage message={error} />}
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-stone-950">Appointments</h2><p className="mt-1 text-sm text-stone-500">Your latest bookings.</p></div>
          <span className="text-sm text-stone-400">{appointments.length} total</span>
        </div>
        {isLoading ? <Loading label="Loading appointments" /> : appointments.length === 0 ? <p className="rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">No appointments yet.</p> : <div className="grid gap-3">{appointments.slice(0, 5).map((appointment) => <div key={appointment.id} className="rounded-xl border border-stone-200 p-4"><div className="flex items-start justify-between gap-4"><span className="font-semibold text-stone-900">{appointment.title}</span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-stone-600">{appointment.status.replace('_', ' ')}</span></div><p className="mt-2 text-sm text-stone-600">{formatDate(appointment.startsAt)}</p></div>)}</div>}
      </Card>
    </section>
  );
}