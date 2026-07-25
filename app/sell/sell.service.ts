import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  productId: string;
  storeId: string;
  customerId: string;
  staffId: string;
  quantity: number;
  finalSellPrice: number;
  transactionDate?: string;
}) => {
  const productExists = await db.product.findUnique({ where: { id: data.productId } });
  if (!productExists) throw new AppError('Product not found', { status: 404, path: 'productId' });

  const storeExists = await db.store.findUnique({ where: { id: data.storeId } });
  if (!storeExists) throw new AppError('Store not found', { status: 404, path: 'storeId' });

  const customerExists = await db.user.findUnique({ where: { id: data.customerId } });
  if (!customerExists) throw new AppError('Customer user not found', { status: 404, path: 'customerId' });

  const staffExists = await db.user.findUnique({ where: { id: data.staffId } });
  if (!staffExists) throw new AppError('Staff user not found', { status: 404, path: 'staffId' });

  const result = await db.sell.create({
    data: {
      productId: data.productId,
      storeId: data.storeId,
      customerId: data.customerId,
      staffId: data.staffId,
      quantity: data.quantity,
      finalSellPrice: data.finalSellPrice,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    productId: string;
    storeId: string;
    customerId: string;
    staffId: string;
    quantity: number;
    finalSellPrice: number;
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
    productId?: string;
    storeId?: string;
    customerId?: string;
    staffId?: string;
    quantity?: number;
    finalSellPrice?: number;
    transactionDate?: string;
  },
) => {
  const findResult = await db.sell.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Sale transaction not found', { status: 404 });

  const updateSet: any = {};
  if (data.productId !== undefined && updateCheck(data.productId, findResult.productId)) updateSet.productId = data.productId;
  if (data.storeId !== undefined && updateCheck(data.storeId, findResult.storeId)) updateSet.storeId = data.storeId;
  if (data.customerId !== undefined && updateCheck(data.customerId, findResult.customerId)) updateSet.customerId = data.customerId;
  if (data.staffId !== undefined && updateCheck(data.staffId, findResult.staffId)) updateSet.staffId = data.staffId;
  if (data.quantity !== undefined && updateCheck(data.quantity, findResult.quantity)) updateSet.quantity = data.quantity;
  if (data.finalSellPrice !== undefined && updateCheck(data.finalSellPrice, findResult.finalSellPrice)) updateSet.finalSellPrice = data.finalSellPrice;
  if (data.transactionDate !== undefined) updateSet.transactionDate = new Date(data.transactionDate);

  const updatedResult = await db.sell.update({
    where: { id },
    data: updateSet,
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
    include: { product: true, store: true, customer: true, staff: true },
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
  if (query.productId) where.productId = query.productId;
  if (query.storeId) where.storeId = query.storeId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.staffId) where.staffId = query.staffId;

  if (query.search) {
    where.OR = [
      { product: { name: { contains: query.search, mode: 'insensitive' } } },
      { product: { sku: { contains: query.search, mode: 'insensitive' } } },
      { store: { name: { contains: query.search, mode: 'insensitive' } } },
      { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
      { staff: { firstName: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'transactionDate'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.sell.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { product: true, store: true, customer: true, staff: true },
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
      product: { select: { sku: true } },
    },
  });
  const headers = ['productId', 'sku', 'storeId', 'customerId', 'staffId', 'quantity', 'finalSellPrice'];
  const rows = items.map((s) => ({
    productId: s.productId,
    sku: s.product?.sku || '',
    storeId: s.storeId,
    customerId: s.customerId,
    staffId: s.staffId,
    quantity: s.quantity,
    finalSellPrice: s.finalSellPrice ? Number(s.finalSellPrice) : 0,
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

