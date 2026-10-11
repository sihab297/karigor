import mongoose, { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { TechnicianProfileModel } from '../../src/models/technician-profile.model';

function validProfile(overrides: Record<string, unknown> = {}) {
  return {
    userId: new Types.ObjectId(),
    serviceIds: ['electrician'],
    skillIds: ['fan', 'ips'],
    areaName: 'Mirpur',
    location: { type: 'Point', coordinates: [90.3654, 23.8223] },
    workingDays: [0, 1, 2, 3, 4, 6],
    workingHours: { start: '09:00', end: '20:00' },
    experienceYears: 5,
    ...overrides,
  };
}

async function errorsOf(data: Record<string, unknown>) {
  try {
    await new TechnicianProfileModel(data).validate();
    return {};
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return error.errors;
    throw error;
  }
}

describe('TechnicianProfileModel', () => {
  it('accepts a valid profile and sets defaults', async () => {
    const profile = new TechnicianProfileModel(validProfile());

    await expect(profile.validate()).resolves.toBeUndefined();
    expect(profile.approvalStatus).toBe('pending');
    expect(profile.acceptingJobs).toBe(true);
    expect(profile.serviceRadiusKm).toBe(10);
    expect(profile.ratingAvg).toBe(0);
    expect(profile.ratingCount).toBe(0);
  });

  it('requires the main details', async () => {
    const errors = await errorsOf({});

    for (const field of [
      'userId',
      'serviceIds',
      'skillIds',
      'areaName',
      'location',
      'workingDays',
      'workingHours',
      'experienceYears',
    ]) {
      expect(errors[field], field).toBeDefined();
    }
    expect(errors.serviceIds?.message).toBe('Choose at least one service');
  });

  it('checks the map point is [longitude, latitude]', async () => {
    expect((await errorsOf(validProfile())).location).toBeUndefined();

    // lat and lng swapped by mistake
    const swapped = await errorsOf(
      validProfile({ location: { type: 'Point', coordinates: [23.8223, 90.3654] } }),
    );
    expect(swapped['location.coordinates']?.message).toBe('Location must be [longitude, latitude]');

    const onlyOne = await errorsOf(
      validProfile({ location: { type: 'Point', coordinates: [90.36] } }),
    );
    expect(onlyOne['location.coordinates']).toBeDefined();
  });

  it('checks working days', async () => {
    expect((await errorsOf(validProfile({ workingDays: [] }))).workingDays?.message).toBe(
      'Choose at least one working day',
    );
    expect((await errorsOf(validProfile({ workingDays: [1, 7] }))).workingDays?.message).toMatch(
      /0 \(Sunday\) to 6/,
    );
    expect((await errorsOf(validProfile({ workingDays: [1, 1] }))).workingDays?.message).toBe(
      'Working days must not repeat',
    );
  });

  it('checks working hours', async () => {
    const badFormat = await errorsOf(
      validProfile({ workingHours: { start: '9am', end: '20:00' } }),
    );
    expect(badFormat['workingHours.start']?.message).toBe('Use 24-hour time like 09:00');

    const wrongOrder = await errorsOf(
      validProfile({ workingHours: { start: '20:00', end: '09:00' } }),
    );
    expect(wrongOrder.workingHours?.message).toBe('Start time must be before end time');
  });

  it('keeps numbers in sensible ranges', async () => {
    expect((await errorsOf(validProfile({ experienceYears: -1 }))).experienceYears).toBeDefined();
    expect((await errorsOf(validProfile({ ratingAvg: 5.5 }))).ratingAvg).toBeDefined();
    expect((await errorsOf(validProfile({ serviceRadiusKm: 100 }))).serviceRadiusKm).toBeDefined();
    expect(
      (await errorsOf(validProfile({ approvalStatus: 'maybe' }))).approvalStatus,
    ).toBeDefined();
  });

  it('hides the NID photo id in JSON but says whether one exists', () => {
    const json = new TechnicianProfileModel(
      validProfile({ nidPhotoPublicId: 'karigor/nid/abc123' }),
    ).toJSON() as Record<string, unknown>;

    expect(json.nidPhotoPublicId).toBeUndefined();
    expect(json.hasNidPhoto).toBe(true);
    expect(json._id).toBeUndefined();
    expect(typeof json.id).toBe('string');
  });

  it('sends jobs done per service as a plain object', () => {
    const json = new TechnicianProfileModel(
      validProfile({ jobsDone: { electrician: 18 } }),
    ).toJSON() as Record<string, unknown>;

    expect(json.jobsDone).toEqual({ electrician: 18 });
    expect((json.location as Record<string, unknown>).id).toBeUndefined();
  });

  it('declares the indexes needed for profiles and "near me" search', () => {
    const indexes = TechnicianProfileModel.schema.indexes();

    expect(indexes).toContainEqual([{ userId: 1 }, expect.objectContaining({ unique: true })]);
    expect(indexes).toContainEqual([{ location: '2dsphere' }, expect.anything()]);
    expect(indexes).toContainEqual([{ approvalStatus: 1, serviceIds: 1 }, expect.anything()]);
  });
});
