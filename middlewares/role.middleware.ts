import { createMiddleware } from 'hono/factory';
import { AuthUser } from '../types/general.type';
import { AppError } from '../utils/appError.utils';

export const requireRole = (allowedRoles: string[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user') as AuthUser;
    if (!user || !allowedRoles.map((r) => r.toUpperCase()).includes(user.role.toUpperCase())) {
      throw new AppError('Forbidden', { status: 403 });
    }
    await next();
  });
