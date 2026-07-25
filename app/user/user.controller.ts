import type { Context } from 'hono';
import { AuthUser } from '../../types/general.type';
import type {
  createSchemaType,
  createManySchemaType,
  updateSchemaType,
  deleteSchemaType,
  getAllSchemaType,
  getSchemaType,
  deleteManySchemaType,
} from './user.schema';
import userService from './user.service';

// CREATE ONE
export const createController = async (c: Context) => {
  const body = c.get('body') as createSchemaType['body'];

  const createdResult = await userService.createOne(body);

  return c.json(
    {
      success: true,
      data: createdResult,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    },
    201,
  );
};

// CREATE MANY
export const createManyController = async (c: Context) => {
  const body = c.get('body') as createManySchemaType['body'];

  const result = await userService.createMany(body);

  return c.json(
    {
      success: true,
      data: result,
      info: {
        success: result.success.length,
        failed: result.failed.length,
      },
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    },
    201,
  );
};

// UPDATE ONE
export const updateController = async (c: Context) => {
  const params = c.get('params') as updateSchemaType['params'];
  const body = c.get('body') as updateSchemaType['body'];

  const updatedResult = await userService.updateOne(params.id, body);

  return c.json({
    success: true,
    data: updatedResult,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

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

// EXPORT CSV
export const exportCsvController = async (c: Context) => {
  const csvData = await userService.exportCsv();
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="user.csv"');
  return c.text(csvData);
};


