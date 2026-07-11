import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { cacheDel, cacheGet, cacheSet } from '../../services/cache.service';
import { db } from '../../services/prisma.service';
import { AuthUser } from '../../types/general.type';
import { AppError } from '../../utils/appError.utils';
import {
  comparePassword,
  generateJWT,
  hashPassword,
} from '../../utils/auth.utils';
import type { loginSchemaType, registerSchemaType } from './auth.schema';

export const registerController = async (c: Context) => {
  // Extract the explicitly nested body exactly like you wanted
  const body = c.get('body') as registerSchemaType['body'];

  const uniqueCheck = await db.user.findFirst({
    where: { email: { equals: body.email, mode: 'insensitive' } },
  });

  if (uniqueCheck) {
    throw new AppError('email already exists', { status: 400, path: 'email' });
  }

  const hashedPassword = await hashPassword(body.password);

  const user = await db.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      password: hashedPassword,
    },
  });

  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';

  await db.userSession.create({
    data: { ip, userAgent, userId: user.id },
  });

  const token = await generateJWT({ id: user.id });

  setCookie(c, 'access', token, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
  });

  return c.json(
    {
      success: true,
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    },
    201,
  );
};

export const loginController = async (c: Context) => {
  // Extract the nested body
  const body = c.get('body') as loginSchemaType['body'];

  const user = await db.user.findFirst({
    where: { email: { equals: body.email, mode: 'insensitive' } },
  });

  if (!user)
    throw new AppError('user not found', { status: 404, path: 'email' });
  if (!user.password)
    throw new AppError('password not found', { status: 404, path: 'password' });

  const verifyResult = await comparePassword(user.password, body.password);

  if (!verifyResult) {
    throw new AppError('password is wrong', { status: 404, path: 'password' });
  }

  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';

  await db.userSession.create({
    data: { ip, userAgent, userId: user.id },
  });

  const token = await generateJWT({ id: user.id });

  setCookie(c, 'access', token, {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
  });

  return c.json({
    success: true,
    data: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

export const getCurrentUser = async (c: Context) => {
  const reqUser = c.get('user') as AuthUser;
  const key = `user:${reqUser.id}`;

  let currentUser = (await cacheGet(key)) as AuthUser | null;

  if (!currentUser) {
    currentUser = await db.user.findUnique({
      where: { id: reqUser.id },
      omit: { password: true },
    });

    if (!currentUser) throw new AppError('Unauthorized', { status: 401 });

    await cacheSet(key, currentUser, 60 * 5);
  }

  return c.json({
    success: true,
    data: currentUser,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

export const userLogout = async (c: Context) => {
  const user = c.get('user') as AuthUser;
  await cacheDel([`user:${user.id}`]);

  deleteCookie(c, 'access');

  return c.json({
    success: true,
    data: null,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

export const profileImageUpdate = async (c: Context) => {
  const user = c.get('user') as AuthUser;

  // 1. Get uploaded files from the custom middleware
  const files = c.get('uploadedFiles');

  // 2. Since this is multipart/form-data, we parse the text fields manually
  const body = await c.req.parseBody();
  const remove = body['remove'] === 'true';

  let profileImage: string | null = null;

  if (remove) {
    profileImage = null;
  } else if (files?.profileImage?.s3Url) {
    profileImage = files.profileImage.s3Url;
  } else {
    throw new AppError('No image provided', { status: 400 });
  }

  // Prisma: update
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { profileImage },
  });

  await cacheDel([`user:${user.id}`]);
  await cacheDel([`jwt-auth-middleware-user:${user.id}`]); // Clear the auth middleware cache too!

  // Strip password before returning
  const { password, ...safeUser } = updatedUser;

  return c.json({
    success: true,
    data: safeUser,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};
