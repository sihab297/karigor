export interface Skill {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  nameBn: string;
  skills: Skill[];
}

export interface Area {
  name: string;
  lat: number;
  lng: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type Radius = 5 | 10 | 15;

export interface TechnicianProfile {
  id: string;
  serviceIds: string[];
  skillIds: string[];
  areaName: string;
  location: { type: 'Point'; coordinates: [number, number] };
  serviceRadiusKm: number;
  workingDays: number[];
  workingHours: { start: string; end: string };
  experienceYears: number;
  acceptingJobs: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  hasNidPhoto: boolean;
}

export interface ProfileForm {
  serviceIds: string[];
  skillIds: string[];
  areaName: string;
  location: LatLng | null;
  serviceRadiusKm: Radius;
  workingDays: number[];
  start: string;
  end: string;
  experienceYears: string;
}
