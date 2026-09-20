import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Loading } from '../components/Feedback';
import { useAuth } from '../auth/useAuth';

export function ProtectedLayout() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return <Loading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-stone-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:flex-nowrap sm:justify-between sm:px-8">
          <button className="min-w-0 flex-1 text-left" onClick={() => navigate('/')}>
            <span className="block text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Concierge</span>
            <span className="text-sm font-semibold text-stone-900">Appointment care</span>
          </button>
          <nav className="order-3 flex w-full items-center justify-between border-t border-stone-100 pt-2 sm:order-0 sm:w-auto sm:justify-normal sm:border-0 sm:pt-0" aria-label="Primary navigation">
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100" onClick={() => navigate('/')}>Chat</button>
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100" onClick={() => navigate('/dashboard')}>Dashboard</button>
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100" onClick={() => navigate('/appointments')}>Appointments</button>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-500 sm:block">{user.name}</span>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12"><Outlet /></main>
    </div>
  );
}