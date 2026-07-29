import { dbConnect, dbDisconnect } from '../services/prisma.service';
import { logger } from '../utils/logger';
import { seedManagers } from './seed-managers';
import { seedStaff } from './seed-staff';
import { seedCustomers } from './seed-customers';

async function seed() {
  await dbConnect();
  logger.info('Starting database seeding...');
  
  await seedManagers();
  await seedStaff();
  await seedCustomers();
  
  logger.info('Database seeding completed successfully!');
  await dbDisconnect();
}

seed().catch(async (e) => {
  logger.error('Database seeding failed:', e);
  await dbDisconnect();
  process.exit(1);
});
