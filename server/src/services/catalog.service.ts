import areas from '../data/areas.json' with { type: 'json' };
import { defaultCatalog, type Catalog } from '../ai/catalog';
import { PriceItemModel } from '../models/price-item.model';
import { SafetyTipModel } from '../models/safety-tip.model';
import { ServiceModel } from '../models/service.model';
import { AppError } from '../utils/app-error';

export function listServices() {
  return ServiceModel.find({ active: true }).sort({ name: 1 });
}

export function listAreas() {
  return [...areas].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listQuickPicks(serviceId: string) {
  if (!(await ServiceModel.exists({ _id: serviceId, active: true }))) {
    throw new AppError(404, 'SERVICE_NOT_FOUND', "We don't offer this service.");
  }
  const items = await PriceItemModel.find({
    serviceId,
    active: true,
    quickPick: { $exists: true, $ne: '' },
  }).sort({ position: 1 });

  return items.map((item) => ({ priceItemId: item._id, label: item.quickPick! }));
}

// the AI always works from the live catalog, so the admin's changes count straight away
export async function loadAiCatalog(): Promise<Catalog> {
  const [services, items, tips] = await Promise.all([
    ServiceModel.find({ active: true }),
    PriceItemModel.find({ active: true }).sort({ position: 1 }),
    SafetyTipModel.find({ active: true }),
  ]);

  return {
    services: services.map((service) => ({
      id: service._id,
      name: service.name,
      nameBn: service.nameBn,
      skills: service.skills.map((skill) => ({ id: skill.id, name: skill.name })),
      priceItems: items
        .filter((item) => item.serviceId === service._id)
        .map((item) => ({
          id: item._id,
          skillId: item.skillId ?? null,
          name: item.name,
          minPrice: item.minPrice,
          maxPrice: item.maxPrice,
          unit: item.unit,
          quickPick: item.quickPick ?? undefined,
        })),
    })),
    emergencyTypes: tips.map((tip) => ({ id: tip._id, name: tip.name, tips: [...tip.tips] })),
    emergencyNumber: defaultCatalog.emergencyNumber,
  };
}
