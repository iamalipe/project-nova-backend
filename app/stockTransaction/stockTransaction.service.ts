import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';

const createOne = async (data: {
  fromStoreId?: string | null;
  fromWarehouseId?: string | null;
  products: any[];
  travelCost: number;
  status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  transactionDate?: string;
}) => {
  if (data.fromStoreId) {
    const storeExists = await db.store.findUnique({ where: { id: data.fromStoreId } });
    if (!storeExists) throw new AppError('From Store not found', { status: 404, path: 'fromStoreId' });
  }

  if (data.fromWarehouseId) {
    const whExists = await db.warehouse.findUnique({ where: { id: data.fromWarehouseId } });
    if (!whExists) throw new AppError('From Warehouse not found', { status: 404, path: 'fromWarehouseId' });
  }

  const result = await db.stockTransaction.create({
    data: {
      fromStoreId: data.fromStoreId || null,
      fromWarehouseId: data.fromWarehouseId || null,
      products: data.products,
      travelCost: data.travelCost,
      status: data.status || 'PENDING',
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    fromStoreId?: string | null;
    fromWarehouseId?: string | null;
    products: any[];
    travelCost: number;
    status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
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
    fromStoreId?: string | null;
    fromWarehouseId?: string | null;
    products?: any[];
    travelCost?: number;
    status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
    transactionDate?: string;
  },
) => {
  const findResult = await db.stockTransaction.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Transaction not found', { status: 404 });

  const updateSet: any = {};
  if (data.fromStoreId !== undefined && updateCheck(data.fromStoreId, findResult.fromStoreId)) updateSet.fromStoreId = data.fromStoreId;
  if (data.fromWarehouseId !== undefined && updateCheck(data.fromWarehouseId, findResult.fromWarehouseId)) updateSet.fromWarehouseId = data.fromWarehouseId;
  if (data.products !== undefined) updateSet.products = data.products;
  if (data.travelCost !== undefined && updateCheck(data.travelCost, findResult.travelCost)) updateSet.travelCost = data.travelCost;
  if (data.status !== undefined && updateCheck(data.status, findResult.status)) updateSet.status = data.status;
  if (data.transactionDate !== undefined) updateSet.transactionDate = new Date(data.transactionDate);

  const updatedResult = await db.stockTransaction.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.stockTransaction.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Transaction not found', { status: 404 });

  const deletedResult = await db.stockTransaction.delete({ where: { id } });
  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.stockTransaction.deleteMany({ where: { id: { in: ids } } });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.stockTransaction.findUnique({
    where: { id },
    include: { fromStore: true, fromWarehouse: true },
  });
  if (!result) throw new AppError('Transaction not found', { status: 404 });
  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
  status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  fromStoreId?: string;
  fromWarehouseId?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.fromStoreId) where.fromStoreId = query.fromStoreId;
  if (query.fromWarehouseId) where.fromWarehouseId = query.fromWarehouseId;

  if (query.search) {
    where.OR = [
      { fromStore: { name: { contains: query.search, mode: 'insensitive' } } },
      { fromWarehouse: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'transactionDate'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.stockTransaction.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { fromStore: true, fromWarehouse: true },
    }),
    db.stockTransaction.count({ where }),
  ]);

  return {
    data: serializeDatesAndDecimals(data),
    pagination: { page, limit, total, current: data.length },
    sort: { order: query.order, orderBy: query.orderBy },
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
