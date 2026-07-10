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

export const updateCheck = (newValue: any, oldValue: any) => {
  if (newValue === undefined) return false;
  if (newValue === null) return false;
  // if (isNaN(newValue)) return false;
  if (newValue === oldValue) return false;
  return true;
};
