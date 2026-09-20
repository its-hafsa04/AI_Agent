import { useEffect, useState, type ReactNode } from 'react';
import { api, type User } from '../lib/api';
import { AuthContext } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('appointment_token')));

  useEffect(() => {
    if (!localStorage.getItem('appointment_token')) {
      return;
    }

    api.me()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem('appointment_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const authenticate = async (action: Promise<{ user: User; token: string }>) => {
    const result = await action;
    localStorage.setItem('appointment_token', result.token);
    setUser(result.user);
  };

  const signOut = () => {
    localStorage.removeItem('appointment_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn: (email, password) => authenticate(api.login(email, password)),
        signUp: (name, email, password) => authenticate(api.signup(name, email, password)),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}