import type { Context } from 'hono';
import type {
  createSchemaType,
  createManySchemaType,
  updateSchemaType,
  deleteSchemaType,
  getAllSchemaType,
  getSchemaType,
  deleteManySchemaType,
} from './store.schema';
import storeService from './store.service';

export const createController = async (c: Context) => {
  const body = c.get('body') as createSchemaType['body'];
  const result = await storeService.createOne(body);
  return c.json({ success: true, data: result, errors: [], timestamp: new Date().toISOString(), message: 'success' }, 201);
};

export const createManyController = async (c: Context) => {
  const body = c.get('body') as createManySchemaType['body'];
  const result = await storeService.createMany(body);
  return c.json({
    success: true,
    data: result,
    info: { success: result.success.length, failed: result.failed.length },
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  }, 201);
};

export const updateController = async (c: Context) => {
  const params = c.get('params') as updateSchemaType['params'];
  const body = c.get('body') as updateSchemaType['body'];
  const result = await storeService.updateOne(params.id, body);
  return c.json({ success: true, data: result, errors: [], timestamp: new Date().toISOString(), message: 'success' });
};

export const deleteController = async (c: Context) => {
  const params = c.get('params') as deleteSchemaType['params'];
  const result = await storeService.deleteOne(params.id);
  return c.json({ success: true, data: result, errors: [], timestamp: new Date().toISOString(), message: 'success' });
};

export const deleteManyController = async (c: Context) => {
  const body = c.get('body') as deleteManySchemaType['body'];
  const result = await storeService.deleteMany(body.ids);
  return c.json({ success: true, data: result, errors: [], timestamp: new Date().toISOString(), message: 'success' });
};

export const getController = async (c: Context) => {
  const params = c.get('params') as getSchemaType['params'];
  const result = await storeService.getOne(params.id);
  return c.json({ success: true, data: result, errors: [], timestamp: new Date().toISOString(), message: 'success' });
};

export const getAllController = async (c: Context) => {
  const query = c.get('query') as unknown as getAllSchemaType['query'];
  const result = await storeService.getAll({ ...query });
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

export const exportCsvController = async (c: Context) => {
  const csvData = await storeService.exportCsv();
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="store.csv"');
  return c.text(csvData);
};

