import type { TechnicianProfile } from '../technician/profile-types';

export type ApprovalTab = 'pending' | 'approved' | 'rejected';

export interface AdminTechnician extends TechnicianProfile {
  userId: string;
  updatedAt: string;
  reviewedAt?: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    status: 'active' | 'blocked';
    joinedAt: string;
  };
}

export interface TechnicianList {
  technicians: AdminTechnician[];
  counts: Record<ApprovalTab, number>;
}

export interface AdminService {
  id: string;
  name: string;
  nameBn: string;
  skills: { id: string; name: string }[];
  active: boolean;
}

export interface AdminPriceItem {
  id: string;
  serviceId: string;
  skillId: string | null;
  name: string;
  minPrice: number;
  maxPrice: number;
  unit: string;
  quickPick?: string;
  position: number;
  active: boolean;
}

export interface AdminSafetyTip {
  id: string;
  name: string;
  tips: string[];
  active: boolean;
}

export interface AdminCatalog {
  services: AdminService[];
  priceItems: AdminPriceItem[];
  safetyTips: AdminSafetyTip[];
}
