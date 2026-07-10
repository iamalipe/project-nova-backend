import type { User } from '../prisma-generated/client';

export type AuthUser = Omit<User, 'password'>;
