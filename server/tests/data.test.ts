import { describe, expect, it } from 'vitest';
import areas from '../src/data/areas.json' with { type: 'json' };
import { defaultCatalog } from '../src/ai/catalog';

const { services, emergencyTypes } = defaultCatalog;

describe('catalog data', () => {
  it('has the 7 services from the proposal', () => {
    expect(services.map((s) => s.id).sort()).toEqual(
      [
        'ac-repair',
        'carpenter',
        'cleaner',
        'electrician',
        'gas-fitter',
        'painter',
        'plumber',
      ].sort(),
    );
  });

  it('uses unique ids for skills and price items', () => {
    const skillIds = services.flatMap((s) => s.skills.map((k) => k.id));
    const priceIds = services.flatMap((s) => s.priceItems.map((p) => p.id));

    expect(new Set(skillIds).size).toBe(skillIds.length);
    expect(new Set(priceIds).size).toBe(priceIds.length);
  });

  it('links every price item to a skill of the same service', () => {
    for (const service of services) {
      const skills = new Set(service.skills.map((k) => k.id));
      for (const item of service.priceItems) {
        if (item.skillId !== null) expect(skills.has(item.skillId), item.id).toBe(true);
      }
    }
  });

  it('has a sensible price range for every item', () => {
    for (const item of services.flatMap((s) => s.priceItems)) {
      expect(item.minPrice, item.id).toBeGreaterThan(0);
      expect(item.maxPrice, item.id).toBeGreaterThanOrEqual(item.minPrice);
    }
  });

  it('gives every skill at least one price item', () => {
    for (const service of services) {
      for (const skill of service.skills) {
        const hasPrice = service.priceItems.some((p) => p.skillId === skill.id);
        expect(hasPrice, `${service.id}/${skill.id}`).toBe(true);
      }
    }
  });

  it('gives every real job a short, unique quick pick', () => {
    for (const service of services) {
      const jobs = service.priceItems.filter((p) => p.skillId !== null);
      const picks = jobs.map((p) => p.quickPick);

      for (const [i, pick] of picks.entries()) {
        expect(pick, jobs[i]!.id).toBeTruthy();
        expect(pick!.length, jobs[i]!.id).toBeLessThanOrEqual(40);
      }
      expect(new Set(picks).size, service.id).toBe(picks.length);
    }
  });

  it('has safety tips for every emergency type', () => {
    for (const type of emergencyTypes) expect(type.tips.length, type.id).toBeGreaterThan(0);
  });

  it('keeps all areas inside Dhaka', () => {
    for (const area of areas) {
      expect(area.lat, area.name).toBeGreaterThan(23.6);
      expect(area.lat, area.name).toBeLessThan(23.95);
      expect(area.lng, area.name).toBeGreaterThan(90.3);
      expect(area.lng, area.name).toBeLessThan(90.55);
    }
  });
});
