import { PriceItemModel } from '../models/price-item.model';
import { SafetyTipModel } from '../models/safety-tip.model';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import { AppError, fieldError } from '../utils/app-error';
import type {
  PriceItemCreateInput,
  PriceItemUpdateInput,
  SafetyTipUpdateInput,
  ServiceUpdateInput,
} from '../validators/catalog-admin.validators';

// "Ceiling fan repair" -> "ceiling-fan-repair"
export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item'
  );
}

// the first free id: "fan", "fan-2", "fan-3"...
function freeId(base: string, taken: (id: string) => boolean) {
  if (!taken(base)) return base;
  for (let n = 2; ; n++) if (!taken(`${base}-${n}`)) return `${base}-${n}`;
}

async function findService(id: string) {
  const service = await ServiceModel.findById(id);
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', "We couldn't find this service.");
  return service;
}

// everything the admin can edit, including what is switched off
export async function getAdminCatalog() {
  const [services, priceItems, safetyTips] = await Promise.all([
    ServiceModel.find().sort({ name: 1 }),
    PriceItemModel.find().sort({ serviceId: 1, position: 1 }),
    SafetyTipModel.find().sort({ name: 1 }),
  ]);
  return { services, priceItems, safetyTips };
}

export async function updateService(id: string, input: ServiceUpdateInput) {
  const service = await findService(id);
  service.set(input);
  await service.save();
  return { service };
}

export async function addSkill(serviceId: string, name: string) {
  const service = await findService(serviceId);
  if (service.skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
    throw fieldError('name', `${service.name} already has this skill`);
  }
  const id = freeId(slugify(name), (candidate) => service.skills.some((s) => s.id === candidate));
  service.skills.push({ id, name });
  await service.save();
  return { service };
}

export async function renameSkill(serviceId: string, skillId: string, name: string) {
  const service = await findService(serviceId);
  const skill = service.skills.find((s) => s.id === skillId);
  if (!skill) throw new AppError(404, 'SKILL_NOT_FOUND', "We couldn't find this skill.");
  skill.name = name;
  await service.save();
  return { service };
}

export async function removeSkill(serviceId: string, skillId: string) {
  const service = await findService(serviceId);
  if (!service.skills.some((s) => s.id === skillId)) {
    throw new AppError(404, 'SKILL_NOT_FOUND', "We couldn't find this skill.");
  }
  if (service.skills.length === 1) {
    throw new AppError(409, 'LAST_SKILL', 'A service needs at least one skill.');
  }
  // removing it would break price items and technician profiles that use it
  const [prices, technicians] = await Promise.all([
    PriceItemModel.countDocuments({ serviceId, skillId }),
    TechnicianProfileModel.countDocuments({ serviceIds: serviceId, skillIds: skillId }),
  ]);
  if (prices > 0 || technicians > 0) {
    const uses = [
      prices > 0 && `${prices} price ${prices === 1 ? 'item' : 'items'}`,
      technicians > 0 && `${technicians} ${technicians === 1 ? 'technician' : 'technicians'}`,
    ].filter(Boolean);
    throw new AppError(
      409,
      'SKILL_IN_USE',
      `This skill is used by ${uses.join(' and ')}. Change those first.`,
    );
  }
  service.skills.pull({ id: skillId });
  await service.save();
  return { service };
}

async function checkSkill(serviceId: string, skillId: string | null | undefined) {
  if (!skillId) return;
  const service = await findService(serviceId);
  if (!service.skills.some((s) => s.id === skillId)) {
    throw fieldError('skillId', `Choose a skill of ${service.name}`);
  }
}

export async function addPriceItem(input: PriceItemCreateInput) {
  await findService(input.serviceId);
  await checkSkill(input.serviceId, input.skillId);
  const existing = await PriceItemModel.find({ serviceId: input.serviceId }, '_id position');
  const ids = new Set((await PriceItemModel.find({}, '_id')).map((item) => item.id as string));
  const id = freeId(`${input.serviceId}-${slugify(input.name)}`, (candidate) => ids.has(candidate));
  const position = Math.max(-1, ...existing.map((item) => item.position)) + 1;
  const priceItem = await PriceItemModel.create({ _id: id, position, ...input });
  return { priceItem };
}

export async function updatePriceItem(id: string, input: PriceItemUpdateInput) {
  const priceItem = await PriceItemModel.findById(id);
  if (!priceItem) {
    throw new AppError(404, 'PRICE_ITEM_NOT_FOUND', "We couldn't find this price item.");
  }
  if (input.skillId !== undefined) await checkSkill(priceItem.serviceId, input.skillId);
  const minPrice = input.minPrice ?? priceItem.minPrice;
  const maxPrice = input.maxPrice ?? priceItem.maxPrice;
  if (maxPrice < minPrice)
    throw fieldError('maxPrice', "The highest price can't be below the lowest");
  priceItem.set(input);
  await priceItem.save();
  return { priceItem };
}

// old problem reports keep their own copy of the price lines, so deleting is safe
export async function removePriceItem(id: string) {
  const result = await PriceItemModel.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new AppError(404, 'PRICE_ITEM_NOT_FOUND', "We couldn't find this price item.");
  }
}

// emergency types are fixed (the AI's rules name them); their name and steps can change
export async function updateSafetyTip(id: string, input: SafetyTipUpdateInput) {
  const tip = await SafetyTipModel.findById(id);
  if (!tip) throw new AppError(404, 'SAFETY_TIP_NOT_FOUND', "We couldn't find this emergency.");
  tip.set(input);
  await tip.save();
  return { safetyTip: tip };
}
