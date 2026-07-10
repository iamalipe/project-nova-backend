import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { cacheGet, cacheSet } from '../services/cache.service';
import { db } from '../services/prisma.service';
import type { AuthUser } from '../types/general.type';
import { verifyJWT } from '../utils/auth.utils';

export const jwtAuth = createMiddleware(async (c, next) => {
  // Use Hono's native cookie parser
  const accessToken = getCookie(c, 'access');

  if (!accessToken) {
    throw new AppError('Unauthorized', { status: 401 });
  }

  // Assuming verifyJWT returns something like { decoded: { id: string }, expired: boolean }
  const { decoded, expired } = await verifyJWT(accessToken);

  if (expired) {
    throw new AppError('Session expired', { status: 401 });
  }

  if (decoded && decoded.id) {
    const key = `jwt-auth-middleware-user:${decoded.id}`;

    let user = await cacheGet<AuthUser>(key);

    if (!user) {
      // UPDATED TO PRISMA SYNTAX: findUnique instead of Mongoose's findById
      const userRes = await db.user.findUnique({
        where: { id: decoded.id },
      });

      if (!userRes) {
        throw new AppError('Unauthorized', { status: 401 });
      }

      // Prisma already returns a plain JavaScript object, so no need for .toObject().
      // You may want to exclude the password here if it's not handled by the type/query.
      const { password, ...userWithoutPassword } = userRes;
      user = userWithoutPassword as unknown as AuthUser;

      await cacheSet(key, user, 60 * 5); // 5 min cache
    }

    // Store the user in Hono's context instead of mutating a req object
    c.set('user', user);

    await next();
    return;
  }

  throw new AppError('Unauthorized', { status: 401 });
});
