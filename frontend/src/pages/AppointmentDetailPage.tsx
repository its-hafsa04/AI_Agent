import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorMessage, Loading } from '../components/Feedback';
import { api, ApiError, type Appointment, type AppointmentStatus } from '../lib/api';

const statuses: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));

export function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [status, setStatus] = useState<AppointmentStatus>('SCHEDULED');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getAppointment(id).then(({ appointment: result }) => { setAppointment(result); setStatus(result.status); }).catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Unable to load this appointment.')).finally(() => setIsLoading(false));
  }, [id]);

  const saveStatus = async () => {
    if (!id) return;
    setIsSaving(true);
    setError('');
    try {
      const result = await api.updateAppointment(id, { status });
      setAppointment(result.appointment);
      setStatus(result.appointment.status);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to update appointment status.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loading label="Loading appointment" />;
  if (!appointment) return <div className="mx-auto max-w-xl space-y-5"><ErrorMessage message={error || 'Appointment not found.'} /><Button variant="secondary" onClick={() => navigate('/appointments')}>Back to appointments</Button></div>;

  return <div className="mx-auto max-w-2xl space-y-6">
    <button className="text-sm font-semibold text-teal-700 hover:underline" onClick={() => navigate('/appointments')}>Back to appointments</button>
    <Card className="overflow-hidden">
      <div className="border-b border-stone-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Appointment details</p><h1 className="mt-2 text-3xl font-semibold text-stone-950">{appointment.title}</h1></div>
      <div className="grid gap-6 bg-[#fbfaf7] p-6 sm:grid-cols-2 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-wider text-stone-500">When</p><p className="mt-2 text-stone-900">{formatDate(appointment.startsAt)}</p><p className="mt-1 text-sm text-stone-500">Ends {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(appointment.endsAt))}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Current status</p><p className="mt-2 font-semibold text-stone-900">{appointment.status.replace('_', ' ')}</p></div>{appointment.notes && <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Notes</p><p className="mt-2 whitespace-pre-wrap text-stone-700">{appointment.notes}</p></div>}</div>
      <div className="border-t border-stone-200 bg-white p-6 sm:p-8"><h2 className="text-base font-semibold text-stone-950">Update status</h2>{error && <div className="mt-4"><ErrorMessage message={error} /></div>}<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="grid flex-1 gap-2 text-sm font-medium text-stone-700" htmlFor="appointment-status">Status<select id="appointment-status" className="min-h-11 rounded-xl border border-stone-300 bg-white px-3.5 text-base font-normal text-stone-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15" value={status} onChange={(event) => setStatus(event.target.value as AppointmentStatus)}>{statuses.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}</select></label><Button onClick={saveStatus} isLoading={isSaving}>Save status</Button></div></div>
    </Card>
  </div>;
}
