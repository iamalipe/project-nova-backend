import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  productId?: string;
  productSku?: string;
  storeId?: string | null;
  storeCode?: string;
  quantity: number;
  minThreshold?: number | null;
}) => {
  let targetProductId = data.productId;
  if (!targetProductId && data.productSku) {
    const product = await db.product.findUnique({ where: { sku: data.productSku } });
    if (!product) throw new AppError(`Product with SKU '${data.productSku}' not found`, { status: 404, path: 'productSku' });
    targetProductId = product.id;
  }
  if (!targetProductId) {
    throw new AppError('Product ID or productSku is required', { status: 400, path: 'productId' });
  }

  let targetStoreId = data.storeId;
  if (!targetStoreId && data.storeCode) {
    const store = await db.store.findUnique({ where: { storeCode: data.storeCode } });
    if (!store) throw new AppError(`Store with code '${data.storeCode}' not found`, { status: 404, path: 'storeCode' });
    targetStoreId = store.id;
  }

  const result = await db.stock.create({
    data: {
      productId: targetProductId,
      storeId: targetStoreId || null,
      quantity: data.quantity,
      minThreshold: data.minThreshold ?? null,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    productId?: string;
    productSku?: string;
    storeId?: string | null;
    storeCode?: string;
    quantity: number;
    minThreshold?: number | null;
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
    storeId?: string | null;
    quantity?: number;
    minThreshold?: number | null;
  },
) => {
  const findResult = await db.stock.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Stock item not found', { status: 404 });

  const updateSet: any = {};
  if (data.productId !== undefined && updateCheck(data.productId, findResult.productId)) updateSet.productId = data.productId;
  if (data.storeId !== undefined && updateCheck(data.storeId, findResult.storeId)) updateSet.storeId = data.storeId;
  if (data.quantity !== undefined && updateCheck(data.quantity, findResult.quantity)) updateSet.quantity = data.quantity;
  if (data.minThreshold !== undefined && updateCheck(data.minThreshold, findResult.minThreshold)) updateSet.minThreshold = data.minThreshold;

  const updatedResult = await db.stock.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.stock.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Stock item not found', { status: 404 });

  const deletedResult = await db.stock.delete({ where: { id } });
  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.stock.deleteMany({ where: { id: { in: ids } } });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.stock.findUnique({
    where: { id },
    include: { product: true, store: true },
  });
  if (!result) throw new AppError('Stock item not found', { status: 404 });
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
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.productId) where.productId = query.productId;
  if (query.storeId) where.storeId = query.storeId;

  if (query.search) {
    where.OR = [
      { product: { name: { contains: query.search, mode: 'insensitive' } } },
      { product: { sku: { contains: query.search, mode: 'insensitive' } } },
      { store: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.stock.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { product: true, store: true },
    }),
    db.stock.count({ where }),
  ]);

  return {
    data: serializeDatesAndDecimals(data),
    pagination: { page, limit, total, current: data.length },
    sort: { order: query.order, orderBy: query.orderBy },
  };
};

const exportCsv = async () => {
  const items = await db.stock.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { sku: true } },
      store: { select: { storeCode: true } },
    },
  });
  const headers = ['productId', 'productSku', 'storeId', 'storeCode', 'quantity', 'minThreshold'];
  const rows = items.map((s) => ({
    productId: s.productId,
    productSku: s.product?.sku || '',
    storeId: s.storeId || '',
    storeCode: s.store?.storeCode || '',
    quantity: s.quantity,
    minThreshold: s.minThreshold ?? '',
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

