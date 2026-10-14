import areas from '../data/areas.json' with { type: 'json' };
import { PriceItemModel } from '../models/price-item.model';
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
