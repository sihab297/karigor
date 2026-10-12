import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { ServiceModel } from '../src/models/service.model';
import { catalogDocs } from '../src/seed/seed-data';
import { useTestDatabase } from './helpers/test-db';

useTestDatabase();

const app = createApp();

beforeEach(async () => {
  await ServiceModel.insertMany(catalogDocs().services);
});

describe('GET /services', () => {
  it('lists the services with their skills, in A to Z order, without logging in', async () => {
    const res = await request(app).get('/api/v1/services');

    expect(res.status).toBe(200);
    const services = res.body.data.services;
    expect(services.map((s: { name: string }) => s.name)).toEqual([
      'AC Repair',
      'Carpenter',
      'Cleaner',
      'Electrician',
      'Gas Fitter',
      'Painter',
      'Plumber',
    ]);
    expect(services.find((s: { id: string }) => s.id === 'electrician')).toMatchObject({
      id: 'electrician',
      nameBn: 'ইলেকট্রিশিয়ান',
      skills: expect.arrayContaining([{ id: 'fan', name: 'Ceiling fan repair and fitting' }]),
    });
  });

  it('hides services the admin switched off', async () => {
    await ServiceModel.updateOne({ _id: 'cleaner' }, { active: false });
    const res = await request(app).get('/api/v1/services');

    expect(res.body.data.services.map((s: { id: string }) => s.id)).not.toContain('cleaner');
  });
});

describe('GET /areas', () => {
  it('lists the Dhaka areas with map positions', async () => {
    const res = await request(app).get('/api/v1/areas');

    expect(res.status).toBe(200);
    expect(res.body.data.areas).toHaveLength(22);
    expect(res.body.data.areas[0]).toEqual({ name: 'Badda', lat: 23.7806, lng: 90.4265 });
  });
});
