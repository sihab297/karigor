import {
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Tags,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './types';

export interface MenuLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const menus: Record<Role, MenuLink[]> = {
  customer: [
    { to: '/request', label: 'Get help', icon: Wrench },
    { to: '/bookings', label: 'My bookings', icon: ClipboardList },
  ],
  technician: [
    { to: '/tech/jobs', label: 'My jobs', icon: Briefcase },
    { to: '/tech/profile', label: 'My profile', icon: UserRound },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/technicians', label: 'Technicians', icon: ShieldCheck },
    { to: '/admin/catalog', label: 'Services and prices', icon: Tags },
    { to: '/admin/bookings', label: 'Bookings and users', icon: ClipboardList },
  ],
};

export const roleNames: Record<Role, string> = {
  customer: 'Customer',
  technician: 'Technician',
  admin: 'Admin',
};
