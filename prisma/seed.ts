import { dbConnect, dbDisconnect } from '../services/prisma.service';
import { logger } from '../utils/logger';

async function seed() {
  await dbConnect();
  logger.info('Database seeding is disabled (no-op).');
  await dbDisconnect();
}

seed().catch(async (e) => {
  logger.error('Database seeding failed:', e);
  await dbDisconnect();
  process.exit(1);
});
