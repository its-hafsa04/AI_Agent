import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorMessage } from '../components/Feedback';
import { Input } from '../components/Input';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isSignup) await signUp(name, email, password);
      else await signIn(email, password);
      navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete that request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f0] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Concierge</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">{isSignup ? 'Set up your care space' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-stone-600">{isSignup ? 'A calmer way to keep appointments moving.' : 'Sign in to continue to your workspace.'}</p>
        </div>
        <Card className="p-6 sm:p-8">
          <form className="grid gap-5" onSubmit={submit}>
            {error && <ErrorMessage message={error} />}
            {isSignup && <Input label="Full name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />}
            <Input label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label="Password" name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">{isSignup ? 'Create account' : 'Sign in'}</Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-stone-600">{isSignup ? 'Already have an account?' : 'New here?'}{' '}<Link className="font-semibold text-teal-800 hover:underline" to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
      </div>
    </main>
  );
}

export function AuthHeading({ children }: { children: ReactNode }) { return <>{children}</>; }