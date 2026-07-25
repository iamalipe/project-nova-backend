import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  name: string;
  flag: string;
  code3: string;
  code2: string;
  tz: string;
  currency3: string;
  currencySymbol: string;
}) => {
  const result = await db.country.create({
    data: {
      name: data.name,
      flag: data.flag,
      code3: data.code3,
      code2: data.code2,
      tz: data.tz,
      currency3: data.currency3,
      currencySymbol: data.currencySymbol,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    flag: string;
    code3: string;
    code2: string;
    tz: string;
    currency3: string;
    currencySymbol: string;
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

  return {
    success,
    failed,
  };
};

const updateOne = async (
  id: string,
  data: {
    name?: string;
    flag?: string;
    code3?: string;
    code2?: string;
    tz?: string;
    currency3?: string;
    currencySymbol?: string;
  },
) => {
  const findResult = await db.country.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Country not found', { status: 404 });

  const updateSet: any = {};

  if (data.name !== undefined && updateCheck(data.name, findResult.name)) updateSet.name = data.name;
  if (data.flag !== undefined && updateCheck(data.flag, findResult.flag)) updateSet.flag = data.flag;
  if (data.code3 !== undefined && updateCheck(data.code3, findResult.code3)) updateSet.code3 = data.code3;
  if (data.code2 !== undefined && updateCheck(data.code2, findResult.code2)) updateSet.code2 = data.code2;
  if (data.tz !== undefined && updateCheck(data.tz, findResult.tz)) updateSet.tz = data.tz;
  if (data.currency3 !== undefined && updateCheck(data.currency3, findResult.currency3)) updateSet.currency3 = data.currency3;
  if (data.currencySymbol !== undefined && updateCheck(data.currencySymbol, findResult.currencySymbol)) updateSet.currencySymbol = data.currencySymbol;

  const updatedResult = await db.country.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.country.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Country not found', { status: 404 });

  const deletedResult = await db.country.delete({
    where: { id },
  });

  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.country.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.country.findUnique({
    where: { id },
  });
  if (!result) throw new AppError('Country not found', { status: 404 });

  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code3: { contains: query.search, mode: 'insensitive' } },
      { code2: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.country.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
    }),
    db.country.count({ where }),
  ]);

  const pagination = {
    page,
    limit,
    total,
    current: data.length,
  };
  const sort = {
    order: query.order,
    orderBy: query.orderBy,
  };

  return {
    data: serializeDatesAndDecimals(data),
    pagination,
    sort,
  };
};

const exportCsv = async () => {
  const items = await db.country.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const headers = ['name', 'flag', 'code2', 'code3', 'tz', 'currency3', 'currencySymbol'];
  const rows = items.map((c) => ({
    name: c.name,
    flag: c.flag,
    code2: c.code2,
    code3: c.code3,
    tz: c.tz,
    currency3: c.currency3,
    currencySymbol: c.currencySymbol,
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

