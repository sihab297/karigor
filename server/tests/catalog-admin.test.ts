import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { PriceItemModel } from '../src/models/price-item.model';
import { SafetyTipModel } from '../src/models/safety-tip.model';
import { ServiceModel } from '../src/models/service.model';
import { TechnicianProfileModel } from '../src/models/technician-profile.model';
import { UserModel, type UserRole } from '../src/models/user.model';
import { catalogDocs } from '../src/seed/seed-data';
import { loadAiCatalog } from '../src/services/catalog.service';
import { createToken } from '../src/utils/jwt';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();
let admin: string;
let phone = 0;

async function tokenFor(role: UserRole) {
  const user = await UserModel.create({
    name: `Test ${role}`,
    phone: `0170000${String(phone++).padStart(4, '0')}`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id as string, token: createToken(user.id, role) };
}

const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object) => {
  const req = request(app)[method](`/api/v1/admin${path}`).set('Authorization', `Bearer ${admin}`);
  return body ? req.send(body) : req;
};

beforeEach(async () => {
  phone = 0;
  const docs = catalogDocs();
  await ServiceModel.insertMany(docs.services);
  await PriceItemModel.insertMany(docs.priceItems);
  await SafetyTipModel.insertMany(docs.safetyTips);
  admin = (await tokenFor('admin')).token;
});

describe('admin catalog', () => {
  it('gives the whole catalog, including what is switched off', async () => {
    await PriceItemModel.updateOne({ _id: 'elec-fan-repair' }, { active: false });

    const res = await call('get', '/catalog');

    expect(res.status).toBe(200);
    expect(res.body.data.services).toHaveLength(7);
    expect(
      res.body.data.priceItems.find((p: { id: string }) => p.id === 'elec-fan-repair'),
    ).toMatchObject({
      active: false,
    });
    expect(res.body.data.safetyTips.length).toBeGreaterThan(0);
  });

  it('adds, renames and removes a skill', async () => {
    const added = await call('post', '/services/electrician/skills', { name: 'Doorbell fitting' });
    expect(added.status).toBe(201);
    const skill = added.body.data.service.skills.find(
      (s: { name: string }) => s.name === 'Doorbell fitting',
    );
    expect(skill.id).toBe('doorbell-fitting');

    const twice = await call('post', '/services/electrician/skills', { name: 'doorbell fitting' });
    expect(twice.status).toBe(400);

    const renamed = await call('patch', '/services/electrician/skills/doorbell-fitting', {
      name: 'Doorbell and chime fitting',
    });
    expect(renamed.status).toBe(200);

    const removed = await call('delete', '/services/electrician/skills/doorbell-fitting');
    expect(removed.status).toBe(200);
    const service = await ServiceModel.findById('electrician');
    expect(service!.skills.some((s) => s.id === 'doorbell-fitting')).toBe(false);
  });

  it('keeps skills that price items or technicians still use', async () => {
    const usedByPrice = await call('delete', '/services/electrician/skills/fan');
    expect(usedByPrice.status).toBe(409);
    expect(usedByPrice.body.error.code).toBe('SKILL_IN_USE');

    await call('post', '/services/electrician/skills', { name: 'Doorbell fitting' });
    const tech = await tokenFor('technician');
    await new TechnicianProfileModel({
      userId: tech.id,
      serviceIds: ['electrician'],
      skillIds: ['doorbell-fitting'],
      areaName: 'Mirpur',
      location: { type: 'Point', coordinates: [90.3654, 23.8223] },
      serviceRadiusKm: 10,
      workingDays: [0],
      workingHours: { start: '09:00', end: '20:00' },
      experienceYears: 1,
    }).save();
    const usedByTech = await call('delete', '/services/electrician/skills/doorbell-fitting');
    expect(usedByTech.status).toBe(409);
    expect(usedByTech.body.error.message).toContain('1 technician');
  });

  it('adds, edits and removes price items, and the AI uses them straight away', async () => {
    const added = await call('post', '/price-items', {
      serviceId: 'plumber',
      skillId: null,
      name: 'Water pump motor repair',
      minPrice: 600,
      maxPrice: 1200,
      unit: 'per motor',
      quickPick: 'Pump not working',
    });
    expect(added.status).toBe(201);
    const id = added.body.data.priceItem.id;
    expect(id).toBe('plumber-water-pump-motor-repair');

    let catalog = await loadAiCatalog();
    let plumber = catalog.services.find((s) => s.id === 'plumber')!;
    expect(plumber.priceItems.at(-1)).toMatchObject({ id, minPrice: 600, maxPrice: 1200 });

    const edited = await call('patch', `/price-items/${id}`, { maxPrice: 1500 });
    expect(edited.body.data.priceItem.maxPrice).toBe(1500);
    const tooLow = await call('patch', `/price-items/${id}`, { maxPrice: 100 });
    expect(tooLow.status).toBe(400);
    expect(tooLow.body.error.details[0].field).toBe('maxPrice');

    await call('patch', `/price-items/${id}`, { active: false });
    catalog = await loadAiCatalog();
    plumber = catalog.services.find((s) => s.id === 'plumber')!;
    expect(plumber.priceItems.some((p) => p.id === id)).toBe(false);

    expect((await call('delete', `/price-items/${id}`)).status).toBe(204);
    expect(await PriceItemModel.findById(id)).toBeNull();
    expect((await call('delete', `/price-items/${id}`)).status).toBe(404);
  });

  it('checks price items before saving', async () => {
    const wrongSkill = await call('post', '/price-items', {
      serviceId: 'plumber',
      skillId: 'fan',
      name: 'Odd item',
      minPrice: 100,
      maxPrice: 200,
      unit: 'per job',
    });
    expect(wrongSkill.status).toBe(400);
    expect(wrongSkill.body.error.details[0].field).toBe('skillId');

    const backwards = await call('post', '/price-items', {
      serviceId: 'plumber',
      skillId: null,
      name: 'Odd item',
      minPrice: 500,
      maxPrice: 200,
      unit: 'per job',
    });
    expect(backwards.status).toBe(400);
  });

  it('edits the safety steps, which the AI then shows', async () => {
    const res = await call('patch', '/safety-tips/gas-leak', {
      tips: ['Turn off the gas valve.', 'Open the windows.', 'Leave and call 999.'],
    });

    expect(res.status).toBe(200);
    const catalog = await loadAiCatalog();
    expect(catalog.emergencyTypes.find((e) => e.id === 'gas-leak')!.tips).toEqual([
      'Turn off the gas valve.',
      'Open the windows.',
      'Leave and call 999.',
    ]);
    expect((await call('patch', '/safety-tips/gas-leak', { tips: [] })).status).toBe(400);
  });

  it('switches a whole service off and on', async () => {
    await call('patch', '/services/cleaner', { active: false });
    const pub = await request(app).get('/api/v1/services');
    expect(pub.body.data.services.some((s: { id: string }) => s.id === 'cleaner')).toBe(false);
  });

  it('is only for the admin', async () => {
    const customer = await tokenFor('customer');
    const res = await request(app)
      .get('/api/v1/admin/catalog')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(403);
  });
});

describe('clearing a quick pick', () => {
  it('removes it from the quick path buttons', async () => {
    await request(app)
      .patch('/api/v1/admin/price-items/elec-fan-repair')
      .set('Authorization', `Bearer ${admin}`)
      .send({ quickPick: '' });

    const res = await request(app).get('/api/v1/services/electrician/quick-picks');
    const labels = res.body.data.quickPicks.map((q: { label: string | null }) => q.label);
    expect(labels).not.toContain('Fan not working');
    expect(
      labels.every((label: string | null) => typeof label === 'string' && label.length > 0),
    ).toBe(true);
  });
});
