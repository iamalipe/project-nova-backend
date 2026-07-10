import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

import { DATABASE_URL } from '../config/default';
import { PrismaClient } from '../prisma-generated/client';
import { logger } from '../utils/logger';
import { databaseResponseTimeHistogram } from '../utils/metrics.utils';

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
export const db = new PrismaClient({ adapter }).$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const endTimer = databaseResponseTimeHistogram.startTimer();

      try {
        // Execute the actual database query
        const result = await query(args);

        // Record success metrics
        endTimer({ operation, success: 'true' });
        return result;
      } catch (error) {
        // Record failure metrics
        endTimer({ operation, success: 'false' });
        throw error;
      }
    },
  },
});

export const dbConnect = async () => {
  try {
    await db.$connect();
    // Prisma doesn't need a ping command; $connect() verifies the connection
    logger.info(`Successfully connected to Database via Prisma.`);
  } catch (error) {
    logger.error('Database connection failed!', error);
    throw error;
  }
};

export const dbDisconnect = async () => {
  await db.$disconnect();
  logger.info('Successfully disconnected from Database.');
};
