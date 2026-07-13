import { db, dbConnect, dbDisconnect } from '../services/prisma.service';
import { hashPassword } from '../utils/auth.utils';
import { logger } from '../utils/logger';

async function seed() {
  await dbConnect();
  logger.info('Database seeding started...');

  const guestExists = await db.user.findUnique({ where: { email: 'test@example.com' } });
  const hashedPassword = await hashPassword('password123');

  if (!guestExists) {
    logger.info('Creating guest test user (test@example.com)...');
    await db.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: hashedPassword,
        role: 'guest',
      },
    });
    logger.info('Test user (test@example.com / password123) created.');
  }

  const adminExists = await db.user.findUnique({ where: { email: 'admin@example.com' } });
  if (!adminExists) {
    logger.info('Creating admin superuser (admin@example.com)...');
    await db.user.create({
      data: {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'superuser',
      },
    });
    logger.info('Admin user (admin@example.com / password123) created.');
  }

  logger.info('Database seeding completed successfully.');
  await dbDisconnect();
}

seed().catch(async (e) => {
  logger.error('Database seeding failed:', e);
  await dbDisconnect();
  process.exit(1);
});
