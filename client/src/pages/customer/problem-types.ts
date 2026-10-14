export interface QuickPick {
  priceItemId: string;
  label: string;
}

export interface PriceLine {
  priceItemId: string;
  name: string;
  unit: string;
  quantity: number;
  minPrice: number;
  maxPrice: number;
}

export interface Analysis {
  understood: boolean;
  serviceId: string | null;
  serviceName: string | null;
  skillIds: string[];
  summary: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  confidence: 'high' | 'medium' | 'low';
  emergencyType: string | null;
  safetyTips: string[];
  emergencyNumber: string | null;
  priceLines: PriceLine[];
  estimate: { min: number; max: number } | null;
  matchesChosenService: boolean;
  followUpQuestion: string | null;
  model: string;
  latencyMs: number;
}

export interface ProblemReport {
  id: string;
  mode: 'describe' | 'quick';
  chosenServiceId?: string;
  text: string;
  photoUrls: string[];
  ai: Analysis | null;
  aiError?: string;
  finalServiceId?: string;
  createdAt: string;
}

export interface Match {
  technicianId: string;
  name: string;
  areaName: string;
  distanceKm: number;
  rating: number | null;
  ratingCount: number;
  jobsDone: number;
  experienceYears: number;
  matchedSkills: { id: string; name: string }[];
  bestMatch: boolean;
}

export interface MatchResult {
  serviceId: string;
  serviceName: string;
  emergency: boolean;
  when: string;
  searchedKm: number;
  matches: Match[];
}
