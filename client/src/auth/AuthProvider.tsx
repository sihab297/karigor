import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { clearToken, getToken, saveToken } from '../lib/token-storage';
import { AuthContext } from './auth-context';
import type { RegisterInput, User } from './types';

interface AuthResponse {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => getToken() !== null);

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  const signIn = useCallback((data: AuthResponse) => {
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (phoneOrEmail: string, password: string) =>
      signIn(
        await api<AuthResponse>('/auth/login', {
          method: 'POST',
          body: { phoneOrEmail, password },
        }),
      ),
    [signIn],
  );

  const register = useCallback(
    async (input: RegisterInput) =>
      signIn(await api<AuthResponse>('/auth/register', { method: 'POST', body: input })),
    [signIn],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checking, login, register, logout }),
    [user, checking, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
