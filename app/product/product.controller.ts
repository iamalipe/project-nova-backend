import type { Context } from 'hono';
import { AuthUser } from '../../types/general.type';
import type {
  createManySchemaType,
  createSchemaType,
  deleteSchemaType,
  getAllSchemaType,
  getSchemaType,
  updateSchemaType,
  deleteManySchemaType,
} from './product.schema';
import productService from './product.service';

// CREATE ONE
export const createController = async (c: Context) => {
  const body = c.get('body') as createSchemaType['body'];
  const user = c.get('user') as AuthUser;

  const result = await productService.createOne(
    {
      ...body,
      userId: user.id,
    },
    user.id,
  );

  return c.json(
    {
      success: true,
      data: result,
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
  const user = c.get('user') as AuthUser;

  const createPayload = body.map((e) => ({ ...e, userId: user.id }));
  const result = await productService.createMany(createPayload, user.id);

  return c.json(
    {
      success: true,
      data: result,
      info: { success: result.success.length, failed: result.failed.length },
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
  const user = c.get('user') as AuthUser;

  const updatedResult = await productService.updateOne(
    params.id,
    body,
    user.id,
  );

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

  const deletedResult = await productService.deleteOne(params.id, user.id);

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
  const user = c.get('user') as AuthUser;

  const result = await productService.getOne(params.id, user.id);

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
  const user = c.get('user') as AuthUser;

  const result = await productService.getAll({ ...query, userId: user.id });

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

  const result = await productService.deleteMany(body.ids, user.id);

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
  const csvData = await productService.exportCsv();
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="product.csv"');
  return c.text(csvData);
};

