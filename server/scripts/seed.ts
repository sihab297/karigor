// Fills the database with the catalog, an admin and test accounts: npm run seed -w server
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../src/config/db';
import { seedDatabase } from '../src/seed/seed';
import { BD_PHONE_REGEX, normalizeBdPhone } from '../src/utils/phone';
import { TEST_CUSTOMERS, TEST_TECHNICIANS } from '../src/seed/seed-data';

const MISSING = 'is missing in server/.env (see .env.example)';
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const seedEnv = z.object({
  MONGODB_URI: z.string({ error: MISSING }).min(1, MISSING),
  ADMIN_NAME: z.string().default('Karigor Admin'),
  ADMIN_PHONE: z
    .string({ error: MISSING })
    .transform(normalizeBdPhone)
    .refine((phone) => BD_PHONE_REGEX.test(phone), 'must be a mobile number like 01700000000'),
  ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
  ADMIN_PASSWORD: z.string({ error: MISSING }).min(8, 'must be at least 8 characters'),
  TEST_USER_PASSWORD: z.string({ error: MISSING }).min(8, 'must be at least 8 characters'),
});

async function main() {
  const parsed = seedEnv.safeParse(process.env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues)
      console.error(`${issue.path.join('.')} ${issue.message}`);
    process.exit(1);
  }
  const env = parsed.data;

  await connectDb(env.MONGODB_URI);
  try {
    const summary = await seedDatabase({
      admin: {
        name: env.ADMIN_NAME,
        phone: env.ADMIN_PHONE,
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      },
      testUserPassword: env.TEST_USER_PASSWORD,
    });

    console.log('\nDatabase is ready:');
    console.table(summary);
    console.log(`Admin login: ${env.ADMIN_PHONE} (password: ADMIN_PASSWORD in .env)`);
    console.log(
      `Test logins: customers ${TEST_CUSTOMERS[0]!.phone}, technicians ${TEST_TECHNICIANS[0]!.phone} to ${TEST_TECHNICIANS.at(-1)!.phone} (password: TEST_USER_PASSWORD in .env)`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
