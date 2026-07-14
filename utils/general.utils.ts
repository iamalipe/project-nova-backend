import { Prisma } from '../prisma-generated/client';

export const mongoIdRegex = /^[0-9a-fA-F]{24}$/;


/**
 * The function `getObjectKeys` recursively retrieves all keys of an object, including nested keys with
 * dot notation.
 * @param obj - The `obj` parameter in the `getObjectKeys` function is an object with string keys and
 * values of any type.
 * @param [parentKey] - The `parentKey` parameter in the `getObjectKeys` function is used to keep track
 * of the parent keys as the function recursively traverses through nested objects. It is a string that
 * represents the key of the parent object in the current recursive call. If the current object being
 * processed is a nested object
 * @returns The `getObjectKeys` function returns an array of strings representing the keys of the input
 * object `obj`, including nested keys if the values are objects.
 */
export const getObjectKeys = (obj: { [key: string]: any }, parentKey = '') => {
  const keys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        keys.push(...getObjectKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }

  return keys;
};

const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;

    if (Array.isArray(a)) {
      const length = a.length;
      if (length !== b.length) return false;
      for (let i = 0; i < length; i++) {
        if (!isDeepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (a instanceof RegExp && b instanceof RegExp) {
      return a.toString() === b.toString();
    }

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;

    for (let i = 0; i < keys.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!isDeepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  // Handle NaN
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
    return true;
  }

  return false;
};

export const updateCheck = (newValue: any, oldValue: any): boolean => {
  if (newValue === undefined) return false;
  if (newValue === null) return false;
  return !isDeepEqual(newValue, oldValue);
};

/**
 * Parses a duration string (e.g. "30min", "2days", "1h") and returns the duration in seconds.
 */
export const parseDurationToSeconds = (duration: string | number): number => {
  if (typeof duration === 'number') return duration;
  const match = duration.match(/^(\d+)\s*(s|sec|seconds|m|min|minutes|h|hours|d|days|w|weeks)?$/);
  if (!match) return 3600; // default 1 hour
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
    case 'sec':
    case 'seconds':
      return value;
    case 'm':
    case 'min':
    case 'minutes':
      return value * 60;
    case 'h':
    case 'hours':
      return value * 60 * 60;
    case 'd':
    case 'days':
      return value * 24 * 60 * 60;
    case 'w':
    case 'weeks':
      return value * 7 * 24 * 60 * 60;
    default:
      return value;
  }
};

/**
 * Recursively traverses an object or array, converting all Date instances to ISO strings
 * and all Decimal instances (Prisma/decimal.js) to JavaScript numbers.
 *
 * @param val The object or array to serialize.
 * @returns A new serialized object or array.
 */
export function serializeDatesAndDecimals<T>(val: T): any {
  if (val === null || val === undefined) {
    return val;
  }

  if (val instanceof Date) {
    return val.toISOString();
  }

  if (
    typeof val === 'object' &&
    (Prisma?.Decimal?.isDecimal(val) ||
      Object.prototype.toString.call(val) === '[object Decimal]' ||
      (typeof (val as any).toNumber === 'function' && typeof (val as any).toFixed === 'function'))
  ) {
    return (val as any).toNumber();
  }

  if (Array.isArray(val)) {
    return val.map(serializeDatesAndDecimals);
  }

  if (typeof val === 'object') {
    const toStringTag = Object.prototype.toString.call(val);
    if (toStringTag !== '[object Object]') {
      return val;
    }

    const copy: any = {};
    for (const key of Object.keys(val)) {
      copy[key] = serializeDatesAndDecimals((val as any)[key]);
    }
    return copy;
  }

  return val;
}
