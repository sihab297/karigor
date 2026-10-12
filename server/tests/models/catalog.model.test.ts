import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { PriceItemModel } from '../../src/models/price-item.model';
import { SafetyTipModel } from '../../src/models/safety-tip.model';
import { ServiceModel } from '../../src/models/service.model';

async function errorsOf(doc: { validate: () => Promise<unknown> }) {
  try {
    await doc.validate();
    return {};
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return error.errors;
    throw error;
  }
}

const tapRepair = {
  _id: 'plumber-tap',
  serviceId: 'plumber',
  skillId: 'tap-repair',
  name: 'Tap repair or replacement',
  minPrice: 200,
  maxPrice: 400,
  unit: 'per tap',
};

describe('ServiceModel', () => {
  it('needs at least one skill', async () => {
    const errors = await errorsOf(
      new ServiceModel({ _id: 'plumber', name: 'Plumber', nameBn: 'প্লাম্বার', skills: [] }),
    );
    expect(errors.skills?.message).toBe('Add at least one skill');
  });

  it('uses the readable id in JSON', () => {
    const json = new ServiceModel({
      _id: 'plumber',
      name: 'Plumber',
      nameBn: 'প্লাম্বার',
      skills: [{ id: 'tap-repair', name: 'Tap repair' }],
    }).toJSON() as Record<string, unknown>;

    expect(json.id).toBe('plumber');
    expect(json._id).toBeUndefined();
    expect(json.skills).toEqual([{ id: 'tap-repair', name: 'Tap repair' }]);
  });
});

describe('PriceItemModel', () => {
  it('accepts a normal price item', async () => {
    expect(await errorsOf(new PriceItemModel(tapRepair))).toEqual({});
  });

  it('allows null skill for "Visit and check"', async () => {
    expect(await errorsOf(new PriceItemModel({ ...tapRepair, skillId: null }))).toEqual({});
  });

  it('rejects a max price lower than the min price', async () => {
    const errors = await errorsOf(new PriceItemModel({ ...tapRepair, maxPrice: 100 }));
    expect(errors.maxPrice?.message).toBe('Max price cannot be less than min price');
  });

  it('rejects negative prices', async () => {
    const errors = await errorsOf(new PriceItemModel({ ...tapRepair, minPrice: -5 }));
    expect(errors.minPrice?.message).toBe('Price cannot be negative');
  });
});

describe('SafetyTipModel', () => {
  it('needs at least one tip', async () => {
    const errors = await errorsOf(new SafetyTipModel({ _id: 'gas-leak', name: 'Gas', tips: [] }));
    expect(errors.tips?.message).toBe('Add at least one tip');
  });
});
