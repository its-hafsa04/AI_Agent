import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorMessage, Loading } from '../components/Feedback';
import { Input } from '../components/Input';
import { api, ApiError, type Appointment } from '../lib/api';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const initialForm = { title: '', notes: '', date: '', startTime: '', endTime: '' };

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const result = await api.listAppointments();
        setAppointments(result.appointments);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : 'Unable to load your appointments.');
      } finally {
        setIsLoading(false);
      }
    };
    void loadAppointments();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = 'Add a purpose for this appointment.';
    if (!form.date) nextErrors.date = 'Choose a date.';
    if (!form.startTime) nextErrors.startTime = 'Choose a start time.';
    if (!form.endTime) nextErrors.endTime = 'Choose an end time.';
    const startsAt = form.date && form.startTime ? new Date(`${form.date}T${form.startTime}`) : null;
    const endsAt = form.date && form.endTime ? new Date(`${form.date}T${form.endTime}`) : null;
    if (startsAt && endsAt && startsAt.getTime() <= Date.now()) nextErrors.startTime = 'Choose a time in the future.';
    if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) nextErrors.endTime = 'End time must be after the start time.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    setError('');
    try {
      const result = await api.createAppointment({ title: form.title.trim(), notes: form.notes.trim() || undefined, startsAt: startsAt!.toISOString(), endsAt: endsAt!.toISOString() });
      setAppointments((current) => [...current, result.appointment].sort((left, right) => left.startsAt.localeCompare(right.startsAt)));
      setForm(initialForm);
      setFieldErrors({});
      navigate(`/appointments/${result.appointment.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to create this appointment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Your schedule</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">Appointments</h1><p className="mt-2 max-w-2xl text-stone-600">Book with the assistant or use the form when you already know the details.</p></div>
      {error && <ErrorMessage message={error} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold text-stone-950">Book an appointment</h2><p className="mt-1 text-sm text-stone-500">All times use your local timezone.</p></div>
          <form className="grid gap-4" onSubmit={submit} noValidate>
            <Input label="Purpose" name="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} error={fieldErrors.title} placeholder="e.g. Consultation" />
            <Input label="Notes (optional)" name="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Anything we should prepare?" />
            <Input label="Date" name="date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} error={fieldErrors.date} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Starts" name="startTime" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} error={fieldErrors.startTime} />
              <Input label="Ends" name="endTime" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} error={fieldErrors.endTime} />
            </div>
            <Button type="submit" isLoading={isSaving}>Book appointment</Button>
          </form>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-stone-950">Upcoming and past</h2><p className="mt-1 text-sm text-stone-500">Select an appointment to view its status.</p></div><span className="text-sm text-stone-400">{appointments.length} total</span></div>
          {isLoading ? <Loading label="Loading appointments" /> : appointments.length === 0 ? <p className="rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">No appointments yet. Your next one can start here.</p> : <div className="grid gap-3">{appointments.map((appointment) => <button key={appointment.id} className="grid gap-2 rounded-xl border border-stone-200 p-4 text-left transition hover:border-teal-500 hover:bg-teal-50/40" onClick={() => navigate(`/appointments/${appointment.id}`)}><div className="flex items-start justify-between gap-4"><span className="font-semibold text-stone-900">{appointment.title}</span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-stone-600">{appointment.status.replace('_', ' ')}</span></div><span className="text-sm text-stone-600">{formatDate(appointment.startsAt)} to {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(appointment.endsAt))}</span>{appointment.notes && <span className="text-sm text-stone-500">{appointment.notes}</span>}</button>)}</div>}
        </Card>
      </div>
      <p className="text-center text-sm text-stone-500">Prefer a conversation? <button className="font-semibold text-teal-700 hover:underline" onClick={() => navigate('/')}>Book with the assistant</button></p>
    </div>
  );
}
