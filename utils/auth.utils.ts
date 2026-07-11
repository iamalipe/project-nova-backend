import * as argon2 from 'argon2';
import { sign, verify } from 'hono/jwt';
import { JWT_EXPIRY, JWT_SECRET } from '../config/default';
import type { AuthUser } from '../types/general.type';
import { parseDurationToSeconds } from './general.utils';

/**
 * Uses argon2 to securely hash a given password.
 */
export const hashPassword = async (password: string) => {
  const hash = await argon2.hash(password);
  return hash;
};

/**
 * Uses argon2 to verify if a given password matches a hashed password.
 */
export const comparePassword = async (hash: string, password: string) => {
  const result = await argon2.verify(hash, password);
  return result;
};

// In generateJWT
export const generateJWT = async (payload: { [key: string]: any }) => {
  const exp = Math.floor(Date.now() / 1000) + parseDurationToSeconds(JWT_EXPIRY);
  const tokenPayload = { ...payload, exp };

  // ADD 'HS256' HERE
  const token = await sign(tokenPayload, JWT_SECRET, 'HS256');
  return token;
};

/**
 * Verifies a JWT token and returns validity and decoded payload.
 * NOTE: This is now an ASYNC function!
 */
export const verifyJWT = async (token: string) => {
  try {
    const decoded = (await verify(token, JWT_SECRET, 'HS256')) as AuthUser & {
      exp: number;
    };

    // Check if it's past the expiration timestamp manually (hono/jwt also throws on expiry)
    const isExpired =
      decoded.exp && decoded.exp < Math.floor(Date.now() / 1000);

    if (isExpired) {
      return { valid: false, expired: true, decoded: null };
    }

    return {
      valid: true,
      expired: false,
      decoded,
    };
  } catch (err: any) {
    // hono/jwt throws 'JwtTokenExpired' if the token is past its `exp` claim
    return {
      valid: false,
      expired: err.name === 'JwtTokenExpired',
      decoded: null,
    };
  }
};
