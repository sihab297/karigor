import areas from '../data/areas.json' with { type: 'json' };
import { ServiceModel } from '../models/service.model';

export function listServices() {
  return ServiceModel.find({ active: true }).sort({ name: 1 });
}

export function listAreas() {
  return [...areas].sort((a, b) => a.name.localeCompare(b.name));
}
