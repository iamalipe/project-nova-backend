import { db } from '../services/prisma.service';
import { Role } from '../prisma-generated/client';
import { hashPassword } from '../utils/auth.utils';
const { STORE_MANAGER_CONFIG } = require('../../demo-data/salary.js');
import { logger } from '../utils/logger';
import { LOCALIZED_NAMES, STREET_NAMES } from './seed-utils';

export async function seedManagers() {
  logger.info('Deleting existing store managers...');
  await db.user.deleteMany({ where: { role: Role.STORE_MANAGER } });

  logger.info('Fetching all stores...');
  const stores = await db.store.findMany({
    include: {
      country: true,
      state: true
    }
  });

  logger.info(`Seeding ${stores.length} store managers...`);
  const hashedPassword = await hashPassword('Abcd@1234');

  const usersToCreate: any[] = [];

  for (const store of stores) {
    const c3 = store.country.code3.toUpperCase();
    const c2 = store.country.code2.toUpperCase();
    const stateSub = store.state.subdivisionCode.toUpperCase();
    const lookupKey = `${c2}-${stateSub}`;

    // Get config
    const config = STORE_MANAGER_CONFIG.find(
      (c: any) => c.subdivisioncode.toUpperCase() === lookupKey
    );
    
    let minSalary = 40000;
    let maxSalary = 80000;
    if (config) {
      minSalary = config.minSalary;
      maxSalary = config.maxSalary;
    }

    const salary = Math.floor(Math.random() * (maxSalary - minSalary + 1)) + minSalary;

    // Localized name choice
    const names = LOCALIZED_NAMES[c3] || LOCALIZED_NAMES['USA'];
    const first = names.first[Math.floor(Math.random() * names.first.length)];
    const last = names.last[Math.floor(Math.random() * names.last.length)];
    
    // Unique email per store manager
    const email = `manager.${store.storeCode.toLowerCase()}@nova.dev`;
    
    // Address
    const streets = STREET_NAMES[c3] || STREET_NAMES['USA'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const streetNum = Math.floor(Math.random() * 900) + 100;
    const address = `${streetNum} ${street}`;

    usersToCreate.push({
      email,
      firstName: first,
      lastName: last,
      password: hashedPassword,
      role: Role.STORE_MANAGER,
      salary,
      countryId: store.countryId,
      stateId: store.stateId,
      address,
      zip: store.zip
    });
  }

  // Bulk create
  const chunkSize = 500;
  for (let i = 0; i < usersToCreate.length; i += chunkSize) {
    const chunk = usersToCreate.slice(i, i + chunkSize);
    await db.user.createMany({
      data: chunk
    });
  }

  logger.info(`Successfully seeded ${usersToCreate.length} store managers!`);
}
