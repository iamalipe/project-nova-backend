import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { cacheGet, cacheSet } from '../services/cache.service';
import { db } from '../services/prisma.service';
import type { AuthUser } from '../types/general.type';
import { AppError } from '../utils/appError.utils';
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
      const user = await db.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new AppError('Unauthorized', { status: 401 });
      }

      await cacheSet(key, user, 60 * 5); // 5 min cache
    }

    // Store the user in Hono's context instead of mutating a req object
    c.set('user', user);

    await next();
    return;
  }

  throw new AppError('Unauthorized', { status: 401 });
});
