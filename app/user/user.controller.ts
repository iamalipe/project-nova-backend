import type { Context } from 'hono';
import { AuthUser } from '../../types/general.type';
import type {
  deleteSchemaType,
  getAllSchemaType,
  getSchemaType,
  deleteManySchemaType,
} from './user.schema';
import userService from './user.service';

// DELETE ONE
export const deleteController = async (c: Context) => {
  const params = c.get('params') as deleteSchemaType['params'];
  const user = c.get('user') as AuthUser;

  const deletedResult = await userService.deleteOne(params.id, user.id);

  return c.json({
    success: true,
    data: deletedResult,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

// GET ONE
export const getController = async (c: Context) => {
  const params = c.get('params') as getSchemaType['params'];

  const result = await userService.getOne(params.id);

  return c.json({
    success: true,
    data: result,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

// GET ALL
export const getAllController = async (c: Context) => {
  const query = c.get('query') as unknown as getAllSchemaType['query'];

  const result = await userService.getAll({ ...query });

  return c.json({
    success: true,
    data: result.data,
    sort: result.sort,
    pagination: result.pagination,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

// DELETE MANY
export const deleteManyController = async (c: Context) => {
  const body = c.get('body') as deleteManySchemaType['body'];
  const user = c.get('user') as AuthUser;

  const result = await userService.deleteMany(body.ids, user.id);

  return c.json({
    success: true,
    data: result,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};
