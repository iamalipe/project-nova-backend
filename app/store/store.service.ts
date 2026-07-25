import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  name: string;
  storeCode: string;
  addressLine1: string;
  zip: string;
  stateId: string;
  countryId: string;
  locationMapLink?: string | null;
  images?: string[];
  description?: string | null;
  yearlyUpkeep: number;
}) => {
  const existing = await db.store.findUnique({
    where: { storeCode: data.storeCode },
  });
  if (existing) {
    throw new AppError('Store code already exists', { status: 400, path: 'storeCode' });
  }

  const result = await db.store.create({
    data: {
      name: data.name,
      storeCode: data.storeCode,
      addressLine1: data.addressLine1,
      zip: data.zip,
      stateId: data.stateId,
      countryId: data.countryId,
      locationMapLink: data.locationMapLink || null,
      images: data.images || [],
      description: data.description || null,
      yearlyUpkeep: data.yearlyUpkeep,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    storeCode: string;
    addressLine1: string;
    zip: string;
    stateId: string;
    countryId: string;
    locationMapLink?: string | null;
    images?: string[];
    description?: string | null;
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
    storeCode?: string;
    addressLine1?: string;
    zip?: string;
    stateId?: string;
    countryId?: string;
    locationMapLink?: string | null;
    images?: string[];
    description?: string | null;
    yearlyUpkeep?: number;
  },
) => {
  const findResult = await db.store.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Store not found', { status: 404 });

  if (data.storeCode && data.storeCode !== findResult.storeCode) {
    const existingCode = await db.store.findUnique({ where: { storeCode: data.storeCode } });
    if (existingCode) {
      throw new AppError('Store code already in use', { status: 400, path: 'storeCode' });
    }
  }

  const updateSet: any = {};
  if (data.name !== undefined && updateCheck(data.name, findResult.name)) updateSet.name = data.name;
  if (data.storeCode !== undefined && updateCheck(data.storeCode, findResult.storeCode)) updateSet.storeCode = data.storeCode;
  if (data.addressLine1 !== undefined && updateCheck(data.addressLine1, findResult.addressLine1)) updateSet.addressLine1 = data.addressLine1;
  if (data.zip !== undefined && updateCheck(data.zip, findResult.zip)) updateSet.zip = data.zip;
  if (data.stateId !== undefined && updateCheck(data.stateId, findResult.stateId)) updateSet.stateId = data.stateId;
  if (data.countryId !== undefined && updateCheck(data.countryId, findResult.countryId)) updateSet.countryId = data.countryId;
  if (data.locationMapLink !== undefined && updateCheck(data.locationMapLink, findResult.locationMapLink)) updateSet.locationMapLink = data.locationMapLink;
  if (data.images !== undefined) updateSet.images = data.images;
  if (data.description !== undefined && updateCheck(data.description, findResult.description)) updateSet.description = data.description;
  if (data.yearlyUpkeep !== undefined && updateCheck(data.yearlyUpkeep, findResult.yearlyUpkeep)) updateSet.yearlyUpkeep = data.yearlyUpkeep;

  const updatedResult = await db.store.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.store.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Store not found', { status: 404 });

  const deletedResult = await db.store.delete({ where: { id } });
  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.store.deleteMany({ where: { id: { in: ids } } });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.store.findUnique({
    where: { id },
    include: { country: true, state: true },
  });
  if (!result) throw new AppError('Store not found', { status: 404 });
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
      { storeCode: { contains: query.search, mode: 'insensitive' } },
      { addressLine1: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.store.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { country: true, state: true },
    }),
    db.store.count({ where }),
  ]);

  return {
    data: serializeDatesAndDecimals(data),
    pagination: { page, limit, total, current: data.length },
    sort: { order: query.order, orderBy: query.orderBy },
  };
};

const exportCsv = async () => {
  const items = await db.store.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const headers = ['name', 'storeCode', 'addressLine1', 'zip', 'countryId', 'stateId', 'yearlyUpkeep'];
  const rows = items.map((s) => ({
    name: s.name,
    storeCode: s.storeCode,
    addressLine1: s.addressLine1,
    zip: s.zip,
    countryId: s.countryId,
    stateId: s.stateId,
    yearlyUpkeep: s.yearlyUpkeep ? Number(s.yearlyUpkeep) : 0,
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

