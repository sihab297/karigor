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
