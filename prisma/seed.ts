import { db, dbConnect, dbDisconnect } from '../services/prisma.service';
import { hashPassword } from '../utils/auth.utils';
import { logger } from '../utils/logger';

async function seed() {
  await dbConnect();
  logger.info('Database seeding started...');

  const userCount = await db.user.count();
  if (userCount === 0) {
    logger.info('No users found. Creating a test user...');
    const hashedPassword = await hashPassword('password123');
    await db.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: hashedPassword,
      },
    });
    logger.info('Test user (test@example.com / password123) created.');
  } else {
    logger.info('Users already exist. Skipping creation.');
  }

  logger.info('Database seeding completed successfully.');
  await dbDisconnect();
}

seed().catch(async (e) => {
  logger.error('Database seeding failed:', e);
  await dbDisconnect();
  process.exit(1);
});
