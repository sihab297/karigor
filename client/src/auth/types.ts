export type Role = 'customer' | 'technician' | 'admin';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  status: 'active' | 'blocked';
}

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'customer' | 'technician';
}

export function homePathFor(role: Role) {
  if (role === 'technician') return '/tech/profile';
  if (role === 'admin') return '/admin';
  return '/request';
}
