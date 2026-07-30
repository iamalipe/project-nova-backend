import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const includeClause = {
  store: true,
  customer: true,
  staff: true,
  cart: {
    include: {
      product: true,
    },
  },
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
    include: includeClause,
  });

  return serializeDatesAndDecimals(result);
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
    include: includeClause,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.sell.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Sale transaction not found', { status: 404 });

  const deletedResult = await db.sell.delete({ where: { id } });
  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.sell.deleteMany({ where: { id: { in: ids } } });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.sell.findUnique({
    where: { id },
    include: includeClause,
  });
  if (!result) throw new AppError('Sale transaction not found', { status: 404 });
  return serializeDatesAndDecimals(result);
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
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

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

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'transactionDate'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    db.sell.findMany({
      where,
      orderBy: orderByStage,
      skip,
      take: limit,
      include: includeClause,
    }),
    db.sell.count({ where }),
  ]);

  return {
    data: serializeDatesAndDecimals(data),
    pagination: { page, limit, total, current: data.length },
    sort: { order: query.order, orderBy: query.orderBy },
  };
};

const exportCsv = async () => {
  const items = await db.sell.findMany({
    orderBy: { transactionDate: 'desc' },
    include: {
      cart: { include: { product: { select: { sku: true } } } },
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
