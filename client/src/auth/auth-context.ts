import { createContext, useContext } from 'react';
import type { RegisterInput, User } from './types';

export interface AuthState {
  user: User | null;
  checking: boolean;
  // set when the login could not be checked (no internet, server down); the login is kept
  checkError: string;
  retryCheck: () => void;
  login: (phoneOrEmail: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
