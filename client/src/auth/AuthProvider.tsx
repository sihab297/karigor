import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { closeLiveSocket } from '../lib/live';
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
  const [checkError, setCheckError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>('/auth/me')
      .then((data) => {
        setUser(data.user);
        setCheckError('');
      })
      .catch((error: unknown) => {
        // only a bad or expired login (or a blocked account) logs the person out;
        // no internet or a server problem keeps them logged in, to try again
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearToken();
          setCheckError('');
        } else {
          setCheckError(
            error instanceof ApiError
              ? error.message
              : "Can't reach Karigor right now. Check your internet and try again.",
          );
        }
      })
      .finally(() => setChecking(false));
  }, [attempt]);

  const retryCheck = useCallback(() => {
    setChecking(true);
    setCheckError('');
    setAttempt((n) => n + 1);
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
    closeLiveSocket();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checking, checkError, retryCheck, login, register, logout }),
    [user, checking, checkError, retryCheck, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
