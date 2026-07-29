import { db } from '../services/prisma.service';
import { Role } from '../prisma-generated/client';
import { hashPassword } from '../utils/auth.utils';
const { CUSTOMER_CONFIG } = require('../../demo-data/salary.js');
import { logger } from '../utils/logger';
import { LOCALIZED_NAMES, STREET_NAMES, generateZip } from './seed-utils';

export async function seedCustomers() {
  logger.info('Deleting existing customers...');
  await db.user.deleteMany({ where: { role: Role.CUSTOMER } });

  logger.info('Fetching all states and countries...');
  const states = await db.countryState.findMany({
    include: {
      country: true
    }
  });

  logger.info(`Seeding customers for ${states.length} states...`);
  const hashedPassword = await hashPassword('Abcd@1234');

  let totalSeeded = 0;
  let batch: any[] = [];

  for (const state of states) {
    const c3 = state.country.code3.toUpperCase();
    const c2 = state.country.code2.toUpperCase();
    const stateSub = state.subdivisionCode.toUpperCase();
    const lookupKey = `${c2}-${stateSub}`;

    // Get config
    const config = CUSTOMER_CONFIG.find(
      (c: any) => c.subdivisioncode.toUpperCase() === lookupKey
    );

    let minCount = 50000;
    let maxCount = 100000;
    
    // Default distributions and salary ranges
    let low_p = 15, norm_p = 60, high_p = 25;
    let c_low_min = 20000, c_low_max = 45000;
    let c_norm_min = 45000, c_norm_max = 100000;
    let c_high_min = 100000, c_high_max = 250000;

    if (config) {
      // NOTE: We do not overwrite minCount and maxCount from configuration
      // so that custom limits (e.g. 50,000 - 100,000) are respected.
      // minCount = config.minCount;
      // maxCount = config.maxCount;
      low_p = config.lowIncomePercentage;
      norm_p = config.normalIncomePercentage;
      high_p = config.highIncomePercentage;

      c_low_min = config.minSalaryForLowIncome;
      c_low_max = config.maxSalaryForLowIncome;
      c_norm_min = config.minSalaryForNormalIncome;
      c_norm_max = config.maxSalaryForNormalIncome;
      c_high_min = config.minSalaryForHighIncome;
      c_high_max = config.maxSalaryForHighIncome;
    }

    // Determine customer count for this state
    const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

    const names = LOCALIZED_NAMES[c3] || LOCALIZED_NAMES['USA'];
    const streets = STREET_NAMES[c3] || STREET_NAMES['USA'];

    for (let j = 0; j < count; j++) {
      // Determine income group
      const roll = Math.floor(Math.random() * 100);
      let salary = 0;
      if (roll < low_p) {
        // Low income
        salary = Math.floor(Math.random() * (c_low_max - c_low_min + 1)) + c_low_min;
      } else if (roll < low_p + norm_p) {
        // Normal income
        salary = Math.floor(Math.random() * (c_norm_max - c_norm_min + 1)) + c_norm_min;
      } else {
        // High income
        salary = Math.floor(Math.random() * (c_high_max - c_high_min + 1)) + c_high_min;
      }

      // Localized name choice
      const first = names.first[Math.floor(Math.random() * names.first.length)];
      const last = names.last[Math.floor(Math.random() * names.last.length)];
      
      // Unique email per customer (stateSub + count index + random key)
      const randomStr = Math.random().toString(36).substring(2, 6);
      const email = `cust.${stateSub.toLowerCase()}.${j + 1}.${randomStr}@example.com`;
      
      // Address
      const street = streets[Math.floor(Math.random() * streets.length)];
      const streetNum = Math.floor(Math.random() * 9900) + 100;
      const address = `${streetNum} ${street}`;
      const zip = generateZip(c3);

      batch.push({
        email,
        firstName: first,
        lastName: last,
        password: hashedPassword,
        role: Role.CUSTOMER,
        salary,
        countryId: state.countryId,
        stateId: state.id,
        address,
        zip
      });

      // Write in batches of 5000 and clear from memory to prevent OOM
      if (batch.length >= 5000) {
        await db.user.createMany({ data: batch });
        totalSeeded += batch.length;
        batch = [];
        logger.info(`Seeded ${totalSeeded} customers so far...`);
      }
    }
  }

  // Write remaining batch
  if (batch.length > 0) {
    await db.user.createMany({ data: batch });
    totalSeeded += batch.length;
  }

  logger.info(`Successfully seeded ${totalSeeded} customers!`);
}
