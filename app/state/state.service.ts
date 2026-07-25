import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  name: string;
  countryId: string;
  subdivisionCode: string;
  tz?: string | null;
  flag?: string | null;
}) => {
  const countryExists = await db.country.findUnique({
    where: { id: data.countryId },
  });
  if (!countryExists) {
    throw new AppError('Country not found', { status: 404, path: 'countryId' });
  }

  const result = await db.countryState.create({
    data: {
      name: data.name,
      countryId: data.countryId,
      subdivisionCode: data.subdivisionCode,
      tz: data.tz || null,
      flag: data.flag || null,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    countryId: string;
    subdivisionCode: string;
    tz?: string | null;
    flag?: string | null;
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
    countryId?: string;
    subdivisionCode?: string;
    tz?: string | null;
    flag?: string | null;
  },
) => {
  const findResult = await db.countryState.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('State not found', { status: 404 });

  const updateSet: any = {};

  if (data.name !== undefined && updateCheck(data.name, findResult.name)) updateSet.name = data.name;
  if (data.subdivisionCode !== undefined && updateCheck(data.subdivisionCode, findResult.subdivisionCode)) updateSet.subdivisionCode = data.subdivisionCode;
  if (data.tz !== undefined && updateCheck(data.tz, findResult.tz)) updateSet.tz = data.tz;
  if (data.flag !== undefined && updateCheck(data.flag, findResult.flag)) updateSet.flag = data.flag;

  if (data.countryId !== undefined && updateCheck(data.countryId, findResult.countryId)) {
    const countryExists = await db.country.findUnique({
      where: { id: data.countryId },
    });
    if (!countryExists) {
      throw new AppError('Country not found', { status: 404, path: 'countryId' });
    }
    updateSet.countryId = data.countryId;
  }

  const updatedResult = await db.countryState.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.countryState.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('State not found', { status: 404 });

  const deletedResult = await db.countryState.delete({
    where: { id },
  });

  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.countryState.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.countryState.findUnique({
    where: { id },
    include: { country: true },
  });
  if (!result) throw new AppError('State not found', { status: 404 });

  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
  countryId?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.countryId) {
    where.countryId = query.countryId;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { subdivisionCode: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.countryState.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { country: true },
    }),
    db.countryState.count({ where }),
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
  const items = await db.countryState.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      country: { select: { code2: true } },
    },
  });
  const headers = ['countrycode2', 'name', 'subdivisioncode', 'tz', 'flag'];
  const rows = items.map((s) => ({
    countrycode2: s.country?.code2 || '',
    name: s.name,
    subdivisioncode: s.subdivisionCode,
    tz: s.tz || '',
    flag: s.flag || '',
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

