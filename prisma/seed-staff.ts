import { Role } from '../prisma-generated/client';
import { db } from '../services/prisma.service';
import { hashPassword } from '../utils/auth.utils';
import { logger } from '../utils/logger';
import { LOCALIZED_NAMES, STREET_NAMES } from './seed-utils';
const { STAFF_CONFIG } = require('../../demo-data/salary.js');

export async function seedStaff() {
  logger.info('Deleting existing store staff...');
  await db.user.deleteMany({ where: { role: Role.STAFF } });

  logger.info('Fetching all stores...');
  const stores = await db.store.findMany({
    include: {
      country: true,
      state: true,
    },
  });

  logger.info('Seeding store staff...');
  const hashedPassword = await hashPassword('Abcd@1234');

  const usersToCreate: any[] = [];

  for (const store of stores) {
    const c3 = store.country.code3.toUpperCase();
    const c2 = store.country.code2.toUpperCase();
    const stateSub = store.state.subdivisionCode.toUpperCase();
    const lookupKey = `${c2}-${stateSub}`;

    // Get config
    const config = STAFF_CONFIG.find(
      (c: any) => c.subdivisioncode.toUpperCase() === lookupKey,
    );

    let minSalary = 20000;
    let maxSalary = 40000;
    let minCount = 2;
    let maxCount = 10;
    if (config) {
      minSalary = config.minSalary;
      maxSalary = config.maxSalary;
      minCount = config.minCount;
      maxCount = config.maxCount;
    }

    // Determine random staff count for this store
    const count =
      Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

    const names = LOCALIZED_NAMES[c3] || LOCALIZED_NAMES['USA'];
    const streets = STREET_NAMES[c3] || STREET_NAMES['USA'];

    for (let j = 0; j < count; j++) {
      const salary =
        Math.floor(Math.random() * (maxSalary - minSalary + 1)) + minSalary;

      // Localized name choice
      const first = names.first[Math.floor(Math.random() * names.first.length)];
      const last = names.last[Math.floor(Math.random() * names.last.length)];

      // Unique email per staff member
      const email = `${first}.staff.${store.storeCode.toLowerCase()}.${j + 1}@yopmail.com`;

      // Address
      const street = streets[Math.floor(Math.random() * streets.length)];
      const streetNum = Math.floor(Math.random() * 900) + 100;
      const address = `${streetNum} ${street}`;

      usersToCreate.push({
        email,
        firstName: first,
        lastName: last,
        password: hashedPassword,
        role: Role.STAFF,
        salary,
        countryId: store.countryId,
        stateId: store.stateId,
        address,
        zip: store.zip,
      });
    }
  }

  // Bulk create in chunks of 1000
  const chunkSize = 1000;
  for (let i = 0; i < usersToCreate.length; i += chunkSize) {
    const chunk = usersToCreate.slice(i, i + chunkSize);
    await db.user.createMany({
      data: chunk,
    });
  }

  logger.info(`Successfully seeded ${usersToCreate.length} store staff!`);
}
