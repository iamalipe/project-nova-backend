import { Socket } from 'socket.io';
import { verifyJWT } from '../utils/auth.utils';
import { db } from '../services/prisma.service';
import { cacheGet, cacheSet } from '../services/cache.service';
import type { AuthUser } from '../types/general.type';
import { AppError } from '../utils/appError.utils';

export interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

export const socketAuthenticate = async (
  socket: AuthenticatedSocket,
  next: (err?: any) => void,
): Promise<void> => {
  try {
    // 1. Extract token from either the handshake 'auth' object (recommended) OR headers
    let accessToken =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (accessToken && accessToken.startsWith('Bearer ')) {
      accessToken = accessToken.replace('Bearer ', '');
    }

    if (!accessToken) {
      return next(
        new AppError('Unauthorized: No token provided', { status: 401 }),
      );
    }

    // 2. Verify the JWT token using our verifyJWT utility
    const { decoded, expired } = await verifyJWT(accessToken);

    if (expired) {
      return next(
        new AppError('Unauthorized: Session expired', { status: 401 }),
      );
    }

    if (!decoded || !decoded.id) {
      return next(
        new AppError('Unauthorized: Invalid token', { status: 401 }),
      );
    }

    const userId = decoded.id;
    const key = `jwt-auth-middleware-user:${userId}`;

    // Try fetching user from cache first
    let user = await cacheGet<AuthUser>(key);

    if (!user) {
      // Fetch user from Prisma Database
      const userRes = await db.user.findUnique({
        where: { id: userId },
      });

      if (!userRes) {
        return next(
          new AppError('Unauthorized: User not found', { status: 401 }),
        );
      }

      // Exclude password field
      const { password, ...userWithoutPassword } = userRes;
      user = userWithoutPassword as unknown as AuthUser;

      // Set user in cache for 5 minutes
      await cacheSet(key, user, 60 * 5);
    }

    // 3. Complete connection setup
    socket.user = user;
    next();
  } catch (error: any) {
    // Catch-all to prevent unhandled promise rejections crashing the socket thread
    next(error);
  }
};