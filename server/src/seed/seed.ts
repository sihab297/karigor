import { PriceItemModel } from '../models/price-item.model';
import { SafetyTipModel } from '../models/safety-tip.model';
import { ServiceModel } from '../models/service.model';
import { TechnicianProfileModel } from '../models/technician-profile.model';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../utils/password';
import { catalogDocs, TEST_CUSTOMERS, TEST_TECHNICIANS, technicianProfileDoc } from './seed-data';

export interface SeedOptions {
  admin: { name: string; phone: string; email?: string; password: string };
  testUserPassword: string;
}

export interface SeedSummary {
  services: number;
  priceItems: number;
  safetyTips: number;
  admins: number;
  customers: number;
  technicians: number;
  approvedTechnicians: number;
}

function upsertById<T extends { _id: string }>(doc: T) {
  return { updateOne: { filter: { _id: doc._id }, update: { $set: doc }, upsert: true } };
}

async function upsertUser(user: {
  name: string;
  phone: string;
  email?: string;
  role: 'customer' | 'technician' | 'admin';
  passwordHash: string;
}) {
  await new UserModel(user).validate();
  const saved = await UserModel.findOneAndUpdate(
    { phone: user.phone },
    { $set: { ...user, status: 'active' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  return saved;
}

// safe to run again: everything is matched by id or phone and updated, never duplicated
export async function seedDatabase(options: SeedOptions): Promise<SeedSummary> {
  await Promise.all(
    [ServiceModel, PriceItemModel, SafetyTipModel, UserModel, TechnicianProfileModel].map((m) =>
      m.syncIndexes(),
    ),
  );

  const catalog = catalogDocs();
  await Promise.all([
    ...catalog.services.map((doc) => new ServiceModel(doc).validate()),
    ...catalog.priceItems.map((doc) => new PriceItemModel(doc).validate()),
    ...catalog.safetyTips.map((doc) => new SafetyTipModel(doc).validate()),
  ]);
  await ServiceModel.bulkWrite(catalog.services.map(upsertById));
  await PriceItemModel.bulkWrite(catalog.priceItems.map(upsertById));
  await SafetyTipModel.bulkWrite(catalog.safetyTips.map(upsertById));

  const [adminHash, testHash] = await Promise.all([
    hashPassword(options.admin.password),
    hashPassword(options.testUserPassword),
  ]);

  await upsertUser({ ...options.admin, role: 'admin', passwordHash: adminHash });

  for (const customer of TEST_CUSTOMERS) {
    await upsertUser({ ...customer, role: 'customer', passwordHash: testHash });
  }

  for (const [index, technician] of TEST_TECHNICIANS.entries()) {
    const user = await upsertUser({
      name: technician.name,
      phone: technician.phone,
      role: 'technician',
      passwordHash: testHash,
    });
    const profile = { userId: user._id, ...technicianProfileDoc(technician, index) };
    await new TechnicianProfileModel(profile).validate();
    await TechnicianProfileModel.updateOne(
      { userId: user._id },
      { $set: profile },
      { upsert: true, runValidators: true },
    );
  }

  const [services, priceItems, safetyTips, admins, customers, technicians, approved] =
    await Promise.all([
      ServiceModel.countDocuments(),
      PriceItemModel.countDocuments(),
      SafetyTipModel.countDocuments(),
      UserModel.countDocuments({ role: 'admin' }),
      UserModel.countDocuments({ role: 'customer' }),
      UserModel.countDocuments({ role: 'technician' }),
      TechnicianProfileModel.countDocuments({ approvalStatus: 'approved' }),
    ]);

  return {
    services,
    priceItems,
    safetyTips,
    admins,
    customers,
    technicians,
    approvedTechnicians: approved,
  };
}
