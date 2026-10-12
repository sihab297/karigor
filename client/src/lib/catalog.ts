import type { Service } from '../pages/technician/profile-types';

export function serviceNames(serviceIds: string[], services: Service[]) {
  return serviceIds.map((id) => services.find((s) => s.id === id)?.name ?? id).join(', ');
}

export function skillNames(skillIds: string[], services: Service[]) {
  const skills = services.flatMap((s) => s.skills);
  return skillIds.map((id) => skills.find((k) => k.id === id)?.name ?? id);
}
