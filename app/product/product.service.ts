import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

// Helper to generate a unique 6-char product SKU using subcategory SKU and name as ref
export const generateProductSku = async (
  subcategoryId: string,
  name: string,
): Promise<string> => {
  const subcategory = await db.subcategory.findUnique({
    where: { id: subcategoryId },
  });
  if (!subcategory) {
    throw new AppError('Subcategory not found', { status: 404 });
  }

  const subcategorySku = subcategory.sku; // E.g., 'ELLA'
  const cleanName = name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const candidates: string[] = [];

  if (cleanName.length >= 2) {
    candidates.push(subcategorySku + cleanName.slice(0, 2));
    for (let i = 2; i < cleanName.length; i++) {
      candidates.push(subcategorySku + cleanName[0] + cleanName[i]);
    }
  } else if (cleanName.length === 1) {
    for (let charCode = 65; charCode <= 90; charCode++) {
      candidates.push(subcategorySku + cleanName[0] + String.fromCharCode(charCode));
    }
    for (let num = 0; num <= 9; num++) {
      candidates.push(subcategorySku + cleanName[0] + num.toString());
    }
  }

  // Sequential numbers '01' to '99'
  for (let num = 1; num <= 99; num++) {
    const numStr = num.toString().padStart(2, '0');
    candidates.push(subcategorySku + numStr);
  }

  // Alphanumeric combinations
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < chars.length; i++) {
    for (let j = 0; j < chars.length; j++) {
      candidates.push(subcategorySku + chars[i] + chars[j]);
    }
  }

  for (const sku of candidates) {
    const exists = await db.product.findUnique({
      where: { sku },
    });
    if (!exists) {
      return sku;
    }
  }

  throw new AppError('Could not generate a unique Product SKU', { status: 400 });
};

const createOne = async (
  data: {
    name: string;
    description?: string;
    subcategoryId: string;
    mrp: number;
    mop: number;
    images?: string;
    userId: string;
  },
  userId: string,
) => {
  // Validate subcategory exists
  const subcategory = await db.subcategory.findUnique({
    where: { id: data.subcategoryId },
  });
  if (!subcategory) {
    throw new AppError('Subcategory not found', { status: 404, path: 'subcategoryId' });
  }

  // Generate unique 6-character SKU
  const sku = await generateProductSku(data.subcategoryId, data.name);

  const result = await db.product.create({
    data: {
      name: data.name,
      description: data.description || null,
      subcategoryId: data.subcategoryId,
      sku,
      mrp: data.mrp,
      mop: data.mop,
      images: data.images || null,
      userId: data.userId,
    },
    include: {
      subcategory: {
        include: {
          category: true,
        },
      },
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    description?: string;
    subcategoryId: string;
    mrp: number;
    mop: number;
    images?: string;
    userId: string;
  }[],
  userId: string,
) => {
  const success: any[] = [];
  const failed: any[] = [];

  for (const item of data) {
    try {
      const created = await createOne(item, userId);
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
    description?: string;
    subcategoryId?: string;
    mrp?: number;
    mop?: number;
    images?: string;
  },
  userId: string,
) => {
  const findResult = await db.product.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Product not found', { status: 404 });

  const updateSet: any = {};

  if (data.name !== undefined && updateCheck(data.name, findResult.name)) {
    updateSet.name = data.name;
  }
  if (data.subcategoryId !== undefined && updateCheck(data.subcategoryId, findResult.subcategoryId)) {
    const subcategory = await db.subcategory.findUnique({
      where: { id: data.subcategoryId },
    });
    if (!subcategory) {
      throw new AppError('Subcategory not found', { status: 404, path: 'subcategoryId' });
    }
    updateSet.subcategoryId = data.subcategoryId;
  }

  // If name or subcategory changed, regenerate SKU
  if (updateSet.name || updateSet.subcategoryId) {
    const targetSubcategoryId = updateSet.subcategoryId || findResult.subcategoryId;
    const targetName = updateSet.name || findResult.name;
    updateSet.sku = await generateProductSku(targetSubcategoryId, targetName);
  }

  if (data.description !== undefined && updateCheck(data.description, findResult.description)) {
    updateSet.description = data.description || null;
  }

  if (
    data.mrp !== undefined &&
    updateCheck(Number(data.mrp), findResult.mrp ? Number(findResult.mrp) : 0)
  ) {
    updateSet.mrp = data.mrp;
  }

  if (
    data.mop !== undefined &&
    updateCheck(Number(data.mop), findResult.mop ? Number(findResult.mop) : 0)
  ) {
    updateSet.mop = data.mop;
  }

  if (data.images !== undefined && updateCheck(data.images, findResult.images)) {
    updateSet.images = data.images || null;
  }

  const updatedResult = await db.product.update({
    where: { id },
    data: updateSet,
    include: {
      subcategory: {
        include: {
          category: true,
        },
      },
    },
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string, userId: string) => {
  const findResult = await db.product.findUnique({
    where: { id },
  });

  if (!findResult) throw new AppError('Product not found', { status: 404 });

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
    include: {
      subcategory: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!result) throw new AppError('Product not found', { status: 404 });

  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  userId?: string;
  search?: string;
  subcategoryId?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.subcategoryId) {
    where.subcategoryId = query.subcategoryId;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
      },
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

const exportCsv = async () => {
  const items = await db.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subcategory: {
        select: { sku: true },
      },
    },
  });
  const headers = ['sub-category sku', 'name', 'mrp', 'mop', 'url', 'description'];
  const rows = items.map((p) => ({
    'sub-category sku': p.subcategory?.sku || '',
    name: p.name,
    mrp: p.mrp ? Number(p.mrp) : '',
    mop: p.mop ? Number(p.mop) : '',
    url: p.images || '',
    description: p.description || '',
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

