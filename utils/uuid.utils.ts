import {
  v4 as uuidv4,
  v7 as uuidv7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';

/**
 * Generates a UUIDv4
 */
export const getUUIDv4 = (): string => {
  return uuidv4();
};

/**
 * Generates a UUIDv7.
 */
export const getUUIDv7 = (): string => {
  return uuidv7();
};

/**
 * Verifies if a string is a valid UUIDv4. Uses native regex, fallbacks to uuid library.
 */
export const verifyUUIDv4 = (uuid: string): boolean => {
  const v4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (v4Regex.test(uuid)) {
    return true;
  }
  try {
    return uuidValidate(uuid) && uuidVersion(uuid) === 4;
  } catch {
    return false;
  }
};

/**
 * Verifies if a string is a valid UUIDv7. Uses native regex, fallbacks to uuid library.
 */
export const verifyUUIDv7 = (uuid: string): boolean => {
  const v7Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (v7Regex.test(uuid)) {
    return true;
  }
  try {
    return uuidValidate(uuid) && uuidVersion(uuid) === 7;
  } catch {
    return false;
  }
};
