import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';

const createOne = async (
  data: {
    name: string;
    description: string;
    category: string;
    userId: string;
    price: number;
  },
  userId: string,
) => {
  // unique check - using name + category + userId
  const uniqueCheck = await db.product.findFirst({
    where: {
      name: { equals: data.name, mode: 'insensitive' },
      category: { equals: data.category, mode: 'insensitive' },
      userId: data.userId,
    },
  });

  if (uniqueCheck)
    throw new AppError('record already exists', { status: 400, path: 'name' });

  const result = await db.product.create({
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      userId: data.userId,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    description: string;
    category: string;
    userId: string;
    price: number;
  }[],
  userId: string,
) => {
  const uniqueArray = data.filter(
    (obj, index, self) =>
      index ===
      self.findIndex(
        (o) =>
          `${o.name}|${o.category}|${o.userId}`.toLowerCase() ===
          `${obj.name}|${obj.category}|${obj.userId}`.toLowerCase(),
      ),
  );

  // Find existing products that match any of the incoming tuples
  const existingProducts = await db.product.findMany({
    where: {
      OR: uniqueArray.map((d) => ({
        name: { equals: d.name, mode: 'insensitive' },
        category: { equals: d.category, mode: 'insensitive' },
        userId: d.userId,
      })),
    },
    select: {
      name: true,
      category: true,
      userId: true,
    },
  });

  const uniqueArrayFinal = uniqueArray.filter(
    (obj) =>
      existingProducts.findIndex(
        (o) =>
          `${o.name}|${o.category}|${o.userId}`.toLowerCase() ===
          `${obj.name}|${obj.category}|${obj.userId}`.toLowerCase(),
      ) === -1,
  );

  const uniqueArrayFailed = uniqueArray.filter(
    (obj) =>
      existingProducts.findIndex(
        (o) =>
          `${o.name}|${o.category}|${o.userId}`.toLowerCase() ===
          `${obj.name}|${obj.category}|${obj.userId}`.toLowerCase(),
      ) !== -1,
  );

  if (uniqueArrayFinal.length === 0) {
    return { success: [], failed: uniqueArrayFailed };
  }

  // Insert non-duplicate data
  await db.product.createMany({
    data: uniqueArrayFinal.map((e) => ({
      name: e.name,
      description: e.description,
      category: e.category,
      price: e.price,
      userId: e.userId,
    })),
  });

  // Retrieve successfully created products to return
  const createdProducts = await db.product.findMany({
    where: {
      OR: uniqueArrayFinal.map((d) => ({
        name: { equals: d.name, mode: 'insensitive' },
        category: { equals: d.category, mode: 'insensitive' },
        userId: d.userId,
      })),
    },
  });

  return {
    success: serializeDatesAndDecimals(createdProducts),
    failed: serializeDatesAndDecimals(uniqueArrayFailed),
  };
};

const updateOne = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
  },
  userId: string,
) => {
  const findResult = await db.product.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('record not found', { status: 404 });

  const updateSet: any = {};

  if (updateCheck(data.name, findResult.name)) {
    updateSet.name = data.name;
  }
  if (updateCheck(data.category, findResult.category)) {
    updateSet.category = data.category;
  }
  if (updateCheck(data.description, findResult.description)) {
    updateSet.description = data.description;
  }
  if (
    data.price !== undefined &&
    updateCheck(
      Number(data.price),
      findResult.price ? Number(findResult.price) : 0,
    )
  ) {
    updateSet.price = data.price;
  }

  const updatedResult = await db.product.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string, userId: string) => {
  const findResult = await db.product.findUnique({
    where: { id },
  });

  if (!findResult) throw new AppError('record not found', { status: 404 });

  const deletedResult = await db.product.delete({
    where: { id },
  });

  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[], userId: string) => {
  const result = await db.product.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string, userId: string) => {
  const result = await db.product.findUnique({
    where: { id },
  });

  if (!result) throw new AppError('record not found', { status: 404 });

  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string | 'createdAt';
  order: string | 'asc' | 'desc';
  userId?: string;
  search?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  // Build match filter
  const where: any = {};
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Build sort stage
  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] =
    query.order === 'asc' ? 'asc' : 'desc';

  // Build pagination
  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
    }),
    db.product.count({ where }),
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
