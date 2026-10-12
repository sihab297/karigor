import areas from '../data/areas.json' with { type: 'json' };
import safetyData from '../data/safety-tips.json' with { type: 'json' };
import services from '../data/services.json' with { type: 'json' };
import type { ApprovalStatus } from '../models/technician-profile.model';

export interface TestTechnician {
  name: string;
  phone: string;
  area: string;
  serviceIds: string[];
  skillIds: string[];
  experienceYears: number;
  ratingAvg: number;
  ratingCount: number;
  jobsDone: Record<string, number>;
  acceptingJobs?: boolean;
  approvalStatus?: ApprovalStatus;
}

export const TEST_CUSTOMERS = [
  { name: 'Nusrat Jahan', phone: '01800000001' },
  { name: 'Imran Hossain', phone: '01800000002' },
];

// fake numbers (0170000000x) so they never belong to a real person
export const TEST_TECHNICIANS: TestTechnician[] = [
  {
    name: 'Rahim Uddin',
    phone: '01700000001',
    area: 'Mirpur',
    serviceIds: ['plumber'],
    skillIds: ['tap-repair', 'pipe-leak', 'flush-repair', 'drain-block'],
    experienceYears: 8,
    ratingAvg: 4.6,
    ratingCount: 14,
    jobsDone: { plumber: 18 },
  },
  {
    name: 'Abdul Karim',
    phone: '01700000002',
    area: 'Dhanmondi',
    serviceIds: ['plumber'],
    skillIds: ['tap-repair', 'basin-fitting', 'shower-fitting', 'geyser-fitting'],
    experienceYears: 12,
    ratingAvg: 4.8,
    ratingCount: 31,
    jobsDone: { plumber: 25 },
  },
  {
    name: 'Shafiqul Islam',
    phone: '01700000003',
    area: 'Uttara',
    serviceIds: ['plumber'],
    skillIds: ['pipe-leak', 'drain-block', 'water-pump'],
    experienceYears: 5,
    ratingAvg: 4.3,
    ratingCount: 9,
    jobsDone: { plumber: 11 },
  },
  {
    name: 'Jamal Hossain',
    phone: '01700000004',
    area: 'Mirpur',
    serviceIds: ['electrician'],
    skillIds: ['fan', 'switch-socket', 'light-fitting', 'ips'],
    experienceYears: 6,
    ratingAvg: 4.7,
    ratingCount: 22,
    jobsDone: { electrician: 20 },
  },
  {
    name: 'Mizanur Rahman',
    phone: '01700000005',
    area: 'Mohammadpur',
    serviceIds: ['electrician'],
    skillIds: ['wiring', 'circuit-breaker', 'switch-socket'],
    experienceYears: 10,
    ratingAvg: 4.5,
    ratingCount: 17,
    jobsDone: { electrician: 16 },
  },
  {
    name: 'Habibur Rahman',
    phone: '01700000006',
    area: 'Badda',
    serviceIds: ['electrician', 'ac-repair'],
    skillIds: ['fan', 'ips', 'ac-service', 'ac-water-leak'],
    experienceYears: 7,
    ratingAvg: 4.4,
    ratingCount: 12,
    jobsDone: { electrician: 9, 'ac-repair': 6 },
  },
  {
    name: 'Tanvir Ahmed',
    phone: '01700000007',
    area: 'Pallabi',
    serviceIds: ['electrician'],
    skillIds: ['fan', 'light-fitting'],
    experienceYears: 2,
    ratingAvg: 0,
    ratingCount: 0,
    jobsDone: {},
  },
  {
    name: 'Nazrul Islam',
    phone: '01700000008',
    area: 'Pallabi',
    serviceIds: ['gas-fitter'],
    skillIds: ['burner-repair', 'gas-leak-repair', 'cylinder-setup'],
    experienceYears: 9,
    ratingAvg: 4.6,
    ratingCount: 19,
    jobsDone: { 'gas-fitter': 21 },
  },
  {
    name: 'Kamal Hossain',
    phone: '01700000009',
    area: 'Khilgaon',
    serviceIds: ['gas-fitter'],
    skillIds: ['burner-repair', 'stove-install', 'gas-line'],
    experienceYears: 4,
    ratingAvg: 4.1,
    ratingCount: 6,
    jobsDone: { 'gas-fitter': 7 },
    acceptingJobs: false,
  },
  {
    name: 'Selim Reza',
    phone: '01700000010',
    area: 'Gulshan',
    serviceIds: ['ac-repair'],
    skillIds: ['ac-service', 'ac-gas', 'ac-install', 'ac-not-cooling'],
    experienceYears: 8,
    ratingAvg: 4.7,
    ratingCount: 26,
    jobsDone: { 'ac-repair': 23 },
  },
  {
    name: 'Faruk Ahmed',
    phone: '01700000011',
    area: 'Dhanmondi',
    serviceIds: ['ac-repair'],
    skillIds: ['ac-service', 'ac-water-leak', 'ac-not-cooling'],
    experienceYears: 3,
    ratingAvg: 4.2,
    ratingCount: 5,
    jobsDone: { 'ac-repair': 5 },
  },
  {
    name: 'Monir Hossain',
    phone: '01700000012',
    area: 'Mohammadpur',
    serviceIds: ['painter'],
    skillIds: ['interior-paint', 'damp-treatment', 'touch-up'],
    experienceYears: 11,
    ratingAvg: 4.5,
    ratingCount: 15,
    jobsDone: { painter: 14 },
  },
  {
    name: 'Babul Mia',
    phone: '01700000013',
    area: 'Rampura',
    serviceIds: ['painter'],
    skillIds: ['interior-paint', 'exterior-paint', 'grill-door-paint'],
    experienceYears: 6,
    ratingAvg: 4.0,
    ratingCount: 8,
    jobsDone: { painter: 8 },
  },
  {
    name: 'Shahidul Islam',
    phone: '01700000014',
    area: 'Farmgate',
    serviceIds: ['carpenter'],
    skillIds: ['door-lock', 'door-repair', 'furniture-repair'],
    experienceYears: 14,
    ratingAvg: 4.8,
    ratingCount: 28,
    jobsDone: { carpenter: 30 },
  },
  {
    name: 'Anwar Hossain',
    phone: '01700000015',
    area: 'Uttara',
    serviceIds: ['carpenter'],
    skillIds: ['furniture-assembly', 'curtain-shelf', 'kitchen-cabinet'],
    experienceYears: 5,
    ratingAvg: 4.3,
    ratingCount: 10,
    jobsDone: { carpenter: 12 },
  },
  {
    name: 'Rina Begum',
    phone: '01700000016',
    area: 'Banani',
    serviceIds: ['cleaner'],
    skillIds: ['home-deep-clean', 'bathroom-clean', 'kitchen-clean'],
    experienceYears: 4,
    ratingAvg: 4.6,
    ratingCount: 13,
    jobsDone: { cleaner: 15 },
  },
  {
    name: 'Shirin Akter',
    phone: '01700000017',
    area: 'Bashundhara',
    serviceIds: ['cleaner'],
    skillIds: ['home-deep-clean', 'sofa-carpet-clean', 'water-tank-clean'],
    experienceYears: 3,
    ratingAvg: 4.4,
    ratingCount: 7,
    jobsDone: { cleaner: 9 },
  },
  {
    name: 'Sohel Rana',
    phone: '01700000018',
    area: 'Lalbagh',
    serviceIds: ['plumber'],
    skillIds: ['tap-repair', 'pipe-leak'],
    experienceYears: 3,
    ratingAvg: 0,
    ratingCount: 0,
    jobsDone: {},
    approvalStatus: 'pending',
  },
  {
    name: 'Arif Hasan',
    phone: '01700000019',
    area: 'Wari',
    serviceIds: ['electrician'],
    skillIds: ['wiring', 'switch-socket'],
    experienceYears: 4,
    ratingAvg: 0,
    ratingCount: 0,
    jobsDone: {},
    approvalStatus: 'pending',
  },
];

export function catalogDocs() {
  return {
    services: services.map(({ id, name, nameBn, skills }) => ({ _id: id, name, nameBn, skills })),
    priceItems: services.flatMap((service) =>
      service.priceItems.map(({ id, ...item }) => ({ _id: id, serviceId: service.id, ...item })),
    ),
    safetyTips: safetyData.emergencyTypes.map(({ id, name, tips }) => ({ _id: id, name, tips })),
  };
}

export function technicianProfileDoc(technician: TestTechnician, index: number) {
  const area = areas.find((a) => a.name === technician.area);
  if (!area) throw new Error(`Unknown area: ${technician.area}`);

  // spread people a few hundred metres around the area centre
  const lat = area.lat + ((index % 3) - 1) * 0.004;
  const lng = area.lng + (((index + 1) % 3) - 1) * 0.004;

  return {
    serviceIds: technician.serviceIds,
    skillIds: technician.skillIds,
    areaName: area.name,
    location: { type: 'Point', coordinates: [lng, lat] },
    // Friday off
    workingDays: [6, 0, 1, 2, 3, 4],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: technician.experienceYears,
    acceptingJobs: technician.acceptingJobs ?? true,
    approvalStatus: technician.approvalStatus ?? 'approved',
    ratingAvg: technician.ratingAvg,
    ratingCount: technician.ratingCount,
    jobsDone: technician.jobsDone,
  };
}
