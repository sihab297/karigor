import servicesData from '../data/services.json' with { type: 'json' };
import safetyData from '../data/safety-tips.json' with { type: 'json' };

export interface Skill {
  id: string;
  name: string;
}

export interface PriceItem {
  id: string;
  /** null for general items such as "Visit and check" */
  skillId: string | null;
  name: string;
  minPrice: number;
  maxPrice: number;
  unit: string;
}

export interface Service {
  id: string;
  name: string;
  nameBn: string;
  skills: Skill[];
  priceItems: PriceItem[];
}

export interface EmergencyType {
  id: string;
  name: string;
  tips: string[];
}

/** Everything the AI needs to know about what Karigor offers. */
export interface Catalog {
  services: Service[];
  emergencyTypes: EmergencyType[];
  emergencyNumber: string;
}

/**
 * Catalog built from the JSON files in src/data.
 * Later the same data will be stored in MongoDB so the admin can edit it.
 */
export const defaultCatalog: Catalog = {
  services: servicesData,
  emergencyTypes: safetyData.emergencyTypes,
  emergencyNumber: safetyData.emergencyNumber,
};

export function findService(catalog: Catalog, serviceId: string): Service | undefined {
  return catalog.services.find((service) => service.id === serviceId);
}

export function findEmergencyType(catalog: Catalog, id: string): EmergencyType | undefined {
  return catalog.emergencyTypes.find((type) => type.id === id);
}
