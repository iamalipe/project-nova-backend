import { db } from '../../services/prisma.service';
import { cacheGet, cacheSet, cacheClear } from '../../services/cache.service';
import { AppError } from '../../utils/appError.utils';
import { updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const selectClause = {
  id: true,
  storeId: true,
  customerId: true,
  staffId: true,
  finalSellPrice: true,
  transactionDate: true,
  createdAt: true,
  updatedAt: true,
  store: {
    select: {
      id: true,
      name: true,
      storeCode: true,
    },
  },
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  staff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  cart: {
    select: {
      id: true,
      sellId: true,
      productId: true,
      quantity: true,
      finalPrice: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          mrp: true,
          mop: true,
          images: true,
        },
      },
    },
  },
};

const serializeSell = (sell: any) => {
  if (!sell) return sell;
  return {
    ...sell,
    finalSellPrice: typeof sell.finalSellPrice === 'object' && sell.finalSellPrice !== null ? Number(sell.finalSellPrice) : sell.finalSellPrice,
    transactionDate: sell.transactionDate instanceof Date ? sell.transactionDate.toISOString() : sell.transactionDate,
    createdAt: sell.createdAt instanceof Date ? sell.createdAt.toISOString() : sell.createdAt,
    updatedAt: sell.updatedAt instanceof Date ? sell.updatedAt.toISOString() : sell.updatedAt,
    cart: Array.isArray(sell.cart)
      ? sell.cart.map((item: any) => ({
          ...item,
          finalPrice: typeof item.finalPrice === 'object' && item.finalPrice !== null ? Number(item.finalPrice) : item.finalPrice,
          product: item.product
            ? {
                ...item.product,
                mrp: typeof item.product.mrp === 'object' && item.product.mrp !== null ? Number(item.product.mrp) : item.product.mrp,
                mop: typeof item.product.mop === 'object' && item.product.mop !== null ? Number(item.product.mop) : item.product.mop,
              }
            : item.product,
        }))
      : sell.cart,
  };
};

const serializeSells = (sells: any[]) => {
  if (!Array.isArray(sells)) return [];
  return sells.map(serializeSell);
};

const invalidateCache = async () => {
  try {
    await cacheClear();
  } catch (err) {
    // Silent fail for cache clear error
  }
};

const createOne = async (data: {
  storeId: string;
  customerId: string;
  staffId: string;
  cart: { productId: string; quantity: number; finalPrice: number }[];
  finalSellPrice?: number;
  transactionDate?: string;
}) => {
  const storeExists = await db.store.findUnique({ where: { id: data.storeId } });
  if (!storeExists) throw new AppError('Store not found', { status: 404, path: 'storeId' });

  const customerExists = await db.user.findUnique({ where: { id: data.customerId } });
  if (!customerExists) throw new AppError('Customer user not found', { status: 404, path: 'customerId' });

  const staffExists = await db.user.findUnique({ where: { id: data.staffId } });
  if (!staffExists) throw new AppError('Staff user not found', { status: 404, path: 'staffId' });

  for (const item of data.cart) {
    const productExists = await db.product.findUnique({ where: { id: item.productId } });
    if (!productExists) throw new AppError(`Product not found: ${item.productId}`, { status: 404, path: 'cart' });
  }

  const calculatedTotal = data.cart.reduce((sum, item) => sum + item.quantity * item.finalPrice, 0);
  const finalSellPrice = data.finalSellPrice !== undefined ? data.finalSellPrice : calculatedTotal;

  const result = await db.sell.create({
    data: {
      storeId: data.storeId,
      customerId: data.customerId,
      staffId: data.staffId,
      finalSellPrice,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
      cart: {
        create: data.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          finalPrice: item.finalPrice,
        })),
      },
    },
    select: selectClause,
  });

  await invalidateCache();
  return serializeSell(result);
};

const createMany = async (
  data: {
    storeId: string;
    customerId: string;
    staffId: string;
    cart: { productId: string; quantity: number; finalPrice: number }[];
    finalSellPrice?: number;
    transactionDate?: string;
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

  await invalidateCache();
  return { success, failed };
};

const updateOne = async (
  id: string,
  data: {
    storeId?: string;
    customerId?: string;
    staffId?: string;
    cart?: { productId: string; quantity: number; finalPrice: number }[];
    finalSellPrice?: number;
    transactionDate?: string;
  },
) => {
  const findResult = await db.sell.findUnique({ where: { id }, include: { cart: true } });
  if (!findResult) throw new AppError('Sale transaction not found', { status: 404 });

  const updateSet: any = {};
  if (data.storeId !== undefined && updateCheck(data.storeId, findResult.storeId)) updateSet.storeId = data.storeId;
  if (data.customerId !== undefined && updateCheck(data.customerId, findResult.customerId)) updateSet.customerId = data.customerId;
  if (data.staffId !== undefined && updateCheck(data.staffId, findResult.staffId)) updateSet.staffId = data.staffId;
  if (data.transactionDate !== undefined) updateSet.transactionDate = new Date(data.transactionDate);

  if (data.cart) {
    for (const item of data.cart) {
      const productExists = await db.product.findUnique({ where: { id: item.productId } });
      if (!productExists) throw new AppError(`Product not found: ${item.productId}`, { status: 404, path: 'cart' });
    }
    const calculatedTotal = data.cart.reduce((sum, item) => sum + item.quantity * item.finalPrice, 0);
    updateSet.finalSellPrice = data.finalSellPrice !== undefined ? data.finalSellPrice : calculatedTotal;

    updateSet.cart = {
      deleteMany: {},
      create: data.cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        finalPrice: item.finalPrice,
      })),
    };
  } else if (data.finalSellPrice !== undefined) {
    updateSet.finalSellPrice = data.finalSellPrice;
  }

  const updatedResult = await db.sell.update({
    where: { id },
    data: updateSet,
    select: selectClause,
  });

  await invalidateCache();
  return serializeSell(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.sell.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Sale transaction not found', { status: 404 });

  const deletedResult = await db.sell.delete({ where: { id } });
  await invalidateCache();
  return serializeSell(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.sell.deleteMany({ where: { id: { in: ids } } });
  await invalidateCache();
  return serializeSell(result);
};

const getOne = async (id: string) => {
  const result = await db.sell.findUnique({
    where: { id },
    select: selectClause,
  });
  if (!result) throw new AppError('Sale transaction not found', { status: 404 });
  return serializeSell(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
  productId?: string;
  storeId?: string;
  customerId?: string;
  staffId?: string;
}) => {
  const limit = Math.max(1, parseInt(query.limit as unknown as string, 10) || 10);
  const rawPage = parseInt(query.page as unknown as string, 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  // Check cache first
  const cacheKey = `sell:all:${JSON.stringify({ ...query, page, limit })}`;
  try {
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e) {
    // Ignore cache error and proceed to DB
  }

  const where: any = {};
  if (query.productId) {
    where.cart = {
      some: {
        productId: query.productId,
      },
    };
  }
  if (query.storeId) where.storeId = query.storeId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.staffId) where.staffId = query.staffId;

  if (query.search) {
    where.OR = [
      { cart: { some: { product: { name: { contains: query.search, mode: 'insensitive' } } } } },
      { cart: { some: { product: { sku: { contains: query.search, mode: 'insensitive' } } } } },
      { store: { name: { contains: query.search, mode: 'insensitive' } } },
      { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
      { staff: { firstName: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const orderByField = query.orderBy || 'transactionDate';
  const orderDirection = query.order === 'asc' ? 'asc' : 'desc';
  const orderByStage: any = { [orderByField]: orderDirection };

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    db.sell.findMany({
      where,
      orderBy: orderByStage,
      skip,
      take: limit,
      select: selectClause,
    }),
    db.sell.count({ where }),
  ]);

  const serializedData = serializeSells(data);

  const responseObj = {
    data: serializedData,
    pagination: { page, limit, total, current: serializedData.length },
    sort: { order: query.order, orderBy: query.orderBy },
  };

  try {
    await cacheSet(cacheKey, responseObj, 30); // cache for 30s
  } catch (e) {
    // Ignore cache write failure
  }

  return responseObj;
};

const exportCsv = async () => {
  const items = await db.sell.findMany({
    orderBy: { transactionDate: 'desc' },
    select: {
      id: true,
      storeId: true,
      customerId: true,
      staffId: true,
      finalSellPrice: true,
      cart: {
        select: {
          productId: true,
          quantity: true,
          finalPrice: true,
          product: { select: { sku: true } },
        },
      },
    },
  });
  const headers = ['sellId', 'storeId', 'customerId', 'staffId', 'productId', 'sku', 'quantity', 'finalPrice', 'finalSellPrice'];
  const rows: any[] = [];
  for (const s of items) {
    for (const c of s.cart) {
      rows.push({
        sellId: s.id,
        storeId: s.storeId,
        customerId: s.customerId,
        staffId: s.staffId,
        productId: c.productId,
        sku: c.product?.sku || '',
        quantity: c.quantity,
        finalPrice: c.finalPrice ? Number(c.finalPrice) : 0,
        finalSellPrice: s.finalSellPrice ? Number(s.finalSellPrice) : 0,
      });
    }
  }
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

