import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';

const createOne = async (data: {
  name: string;
  countryId: string;
  code2: string;
  code3: string;
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
      code2: data.code2,
      code3: data.code3,
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
    code2: string;
    code3: string;
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
    code2?: string;
    code3?: string;
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
  if (data.code2 !== undefined && updateCheck(data.code2, findResult.code2)) updateSet.code2 = data.code2;
  if (data.code3 !== undefined && updateCheck(data.code3, findResult.code3)) updateSet.code3 = data.code3;
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
      { code2: { contains: query.search, mode: 'insensitive' } },
      { code3: { contains: query.search, mode: 'insensitive' } },
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

export default {
  createOne,
  createMany,
  updateOne,
  deleteOne,
  deleteMany,
  getOne,
  getAll,
};
