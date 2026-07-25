import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  name: string;
  warehouseCode: string;
  addressLine1: string;
  zip: string;
  stateId: string;
  countryId: string;
  mapLocation?: string | null;
  images?: string[];
  description?: string | null;
  supplyStoreIds?: string[];
  yearlyUpkeep: number;
}) => {
  const existing = await db.warehouse.findUnique({
    where: { warehouseCode: data.warehouseCode },
  });
  if (existing) {
    throw new AppError('Warehouse code already exists', { status: 400, path: 'warehouseCode' });
  }

  const result = await db.warehouse.create({
    data: {
      name: data.name,
      warehouseCode: data.warehouseCode,
      addressLine1: data.addressLine1,
      zip: data.zip,
      stateId: data.stateId,
      countryId: data.countryId,
      mapLocation: data.mapLocation || null,
      images: data.images || [],
      description: data.description || null,
      supplyStoreIds: data.supplyStoreIds || [],
      yearlyUpkeep: data.yearlyUpkeep,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    warehouseCode: string;
    addressLine1: string;
    zip: string;
    stateId: string;
    countryId: string;
    mapLocation?: string | null;
    images?: string[];
    description?: string | null;
    supplyStoreIds?: string[];
    yearlyUpkeep: number;
  }[],
) => {
  const success: any[] = [];
  const failed: any[] = [];

  for (const item of data) {
    try {
      const created = await createOne(item);
      success.push(created);
    } catch (err) {
      failed.push(item);
    }
  }

  return { success, failed };
};

const updateOne = async (
  id: string,
  data: {
    name?: string;
    warehouseCode?: string;
    addressLine1?: string;
    zip?: string;
    stateId?: string;
    countryId?: string;
    mapLocation?: string | null;
    images?: string[];
    description?: string | null;
    supplyStoreIds?: string[];
    yearlyUpkeep?: number;
  },
) => {
  const findResult = await db.warehouse.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Warehouse not found', { status: 404 });

  if (data.warehouseCode && data.warehouseCode !== findResult.warehouseCode) {
    const existingCode = await db.warehouse.findUnique({ where: { warehouseCode: data.warehouseCode } });
    if (existingCode) {
      throw new AppError('Warehouse code already in use', { status: 400, path: 'warehouseCode' });
    }
  }

  const updateSet: any = {};
  if (data.name !== undefined && updateCheck(data.name, findResult.name)) updateSet.name = data.name;
  if (data.warehouseCode !== undefined && updateCheck(data.warehouseCode, findResult.warehouseCode)) updateSet.warehouseCode = data.warehouseCode;
  if (data.addressLine1 !== undefined && updateCheck(data.addressLine1, findResult.addressLine1)) updateSet.addressLine1 = data.addressLine1;
  if (data.zip !== undefined && updateCheck(data.zip, findResult.zip)) updateSet.zip = data.zip;
  if (data.stateId !== undefined && updateCheck(data.stateId, findResult.stateId)) updateSet.stateId = data.stateId;
  if (data.countryId !== undefined && updateCheck(data.countryId, findResult.countryId)) updateSet.countryId = data.countryId;
  if (data.mapLocation !== undefined && updateCheck(data.mapLocation, findResult.mapLocation)) updateSet.mapLocation = data.mapLocation;
  if (data.images !== undefined) updateSet.images = data.images;
  if (data.description !== undefined && updateCheck(data.description, findResult.description)) updateSet.description = data.description;
  if (data.supplyStoreIds !== undefined) updateSet.supplyStoreIds = data.supplyStoreIds;
  if (data.yearlyUpkeep !== undefined && updateCheck(data.yearlyUpkeep, findResult.yearlyUpkeep)) updateSet.yearlyUpkeep = data.yearlyUpkeep;

  const updatedResult = await db.warehouse.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.warehouse.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Warehouse not found', { status: 404 });

  const deletedResult = await db.warehouse.delete({ where: { id } });
  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.warehouse.deleteMany({ where: { id: { in: ids } } });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.warehouse.findUnique({
    where: { id },
    include: { country: true, state: true },
  });
  if (!result) throw new AppError('Warehouse not found', { status: 404 });
  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
  countryId?: string;
  stateId?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.stateId) where.stateId = query.stateId;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { warehouseCode: { contains: query.search, mode: 'insensitive' } },
      { addressLine1: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.warehouse.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { country: true, state: true },
    }),
    db.warehouse.count({ where }),
  ]);

  return {
    data: serializeDatesAndDecimals(data),
    pagination: { page, limit, total, current: data.length },
    sort: { order: query.order, orderBy: query.orderBy },
  };
};

const exportCsv = async () => {
  const items = await db.warehouse.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const headers = ['name', 'warehouseCode', 'addressLine1', 'zip', 'countryId', 'stateId', 'yearlyUpkeep'];
  const rows = items.map((w) => ({
    name: w.name,
    warehouseCode: w.warehouseCode,
    addressLine1: w.addressLine1,
    zip: w.zip,
    countryId: w.countryId,
    stateId: w.stateId,
    yearlyUpkeep: w.yearlyUpkeep ? Number(w.yearlyUpkeep) : 0,
  }));
  return generateCsv(headers, rows);
};

export default {
  createOne,
  createMany,
  updateOne,
  deleteOne,
  deleteMany,
  getOne,
  getAll,
  exportCsv,
};

