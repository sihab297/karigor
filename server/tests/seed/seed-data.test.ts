import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import areas from '../../src/data/areas.json' with { type: 'json' };
import services from '../../src/data/services.json' with { type: 'json' };
import { PriceItemModel } from '../../src/models/price-item.model';
import { SafetyTipModel } from '../../src/models/safety-tip.model';
import { ServiceModel } from '../../src/models/service.model';
import { TechnicianProfileModel } from '../../src/models/technician-profile.model';
import { UserModel } from '../../src/models/user.model';
import {
  catalogDocs,
  TEST_CUSTOMERS,
  TEST_TECHNICIANS,
  technicianProfileDoc,
} from '../../src/seed/seed-data';

describe('catalog seed data', () => {
  const catalog = catalogDocs();

  it('copies every service, price item and safety tip from the data files', () => {
    expect(catalog.services).toHaveLength(7);
    expect(catalog.priceItems).toHaveLength(services.flatMap((s) => s.priceItems).length);
    expect(catalog.safetyTips).toHaveLength(4);
  });

  it('passes model validation', async () => {
    await Promise.all([
      ...catalog.services.map((doc) => new ServiceModel(doc).validate()),
      ...catalog.priceItems.map((doc) => new PriceItemModel(doc).validate()),
      ...catalog.safetyTips.map((doc) => new SafetyTipModel(doc).validate()),
    ]);
  });
});

describe('test accounts', () => {
  const allPhones = [...TEST_CUSTOMERS, ...TEST_TECHNICIANS].map((u) => u.phone);

  it('use unique, valid phone numbers', async () => {
    expect(new Set(allPhones).size).toBe(allPhones.length);
    for (const person of [...TEST_CUSTOMERS, ...TEST_TECHNICIANS]) {
      await new UserModel({ ...person, role: 'customer', passwordHash: 'x' }).validate();
    }
  });

  it('give technicians only skills from their own services', () => {
    for (const technician of TEST_TECHNICIANS) {
      const allowed = services
        .filter((s) => technician.serviceIds.includes(s.id))
        .flatMap((s) => s.skills.map((k) => k.id));
      for (const skill of technician.skillIds) {
        expect(allowed, `${technician.name}: ${skill}`).toContain(skill);
      }
      for (const service of Object.keys(technician.jobsDone)) {
        expect(technician.serviceIds, technician.name).toContain(service);
      }
    }
  });

  it('have at least two approved technicians for every service', () => {
    for (const service of services) {
      const approved = TEST_TECHNICIANS.filter(
        (t) => t.serviceIds.includes(service.id) && (t.approvalStatus ?? 'approved') === 'approved',
      );
      expect(approved.length, service.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('include the special cases we need to test later', () => {
    expect(TEST_TECHNICIANS.some((t) => t.approvalStatus === 'pending')).toBe(true);
    expect(TEST_TECHNICIANS.some((t) => t.acceptingJobs === false)).toBe(true);
    expect(TEST_TECHNICIANS.some((t) => t.ratingCount === 0 && !t.approvalStatus)).toBe(true);
  });

  it('build valid technician profiles placed in known Dhaka areas', async () => {
    for (const [index, technician] of TEST_TECHNICIANS.entries()) {
      const doc = technicianProfileDoc(technician, index);
      await new TechnicianProfileModel({ userId: new Types.ObjectId(), ...doc }).validate();

      const area = areas.find((a) => a.name === doc.areaName)!;
      const [lng, lat] = doc.location.coordinates;
      expect(Math.abs(lat! - area.lat), technician.name).toBeLessThan(0.01);
      expect(Math.abs(lng! - area.lng), technician.name).toBeLessThan(0.01);
    }
  });
});
