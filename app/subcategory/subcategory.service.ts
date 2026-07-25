import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

// Helper to generate a unique 4-char subcategory SKU using parent category SKU and subcategory name as ref
export const generateSubcategorySku = async (
  categoryId: string,
  name: string,
): Promise<string> => {
  const category = await db.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    throw new AppError('Category not found', { status: 404 });
  }

  const categorySku = category.sku; // E.g., 'EL'
  const cleanName = name.replace(/[^A-Z]/gi, '').toUpperCase();
  const candidates: string[] = [];

  if (cleanName.length >= 2) {
    candidates.push(categorySku + cleanName.slice(0, 2));
    for (let i = 2; i < cleanName.length; i++) {
      candidates.push(categorySku + cleanName[0] + cleanName[i]);
    }
  } else if (cleanName.length === 1) {
    for (let charCode = 65; charCode <= 90; charCode++) {
      candidates.push(categorySku + cleanName[0] + String.fromCharCode(charCode));
    }
  }

  const firstChar = cleanName.length > 0 ? cleanName[0] : 'A';
  for (let charCode = 65; charCode <= 90; charCode++) {
    candidates.push(categorySku + firstChar + String.fromCharCode(charCode));
  }

  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      candidates.push(categorySku + String.fromCharCode(i) + String.fromCharCode(j));
    }
  }

  for (const sku of candidates) {
    const exists = await db.subcategory.findUnique({
      where: { sku },
    });
    if (!exists) {
      return sku;
    }
  }

  throw new AppError('Could not generate a unique Subcategory SKU', { status: 400 });
};

const createOne = async (data: {
  name: string;
  categoryId: string;
  description?: string;
  images?: string;
}) => {
  // Check category exists
  const category = await db.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) {
    throw new AppError('Category not found', { status: 404, path: 'categoryId' });
  }

  // Generate unique 4-character SKU
  const sku = await generateSubcategorySku(data.categoryId, data.name);

  const result = await db.subcategory.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      sku,
      description: data.description || null,
      images: data.images || null,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    categoryId: string;
    description?: string;
    images?: string;
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
    categoryId?: string;
    description?: string;
    images?: string;
  },
) => {
  const findResult = await db.subcategory.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Subcategory not found', { status: 404 });

  const updateSet: any = {};

  if (data.categoryId !== undefined && updateCheck(data.categoryId, findResult.categoryId)) {
    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new AppError('Category not found', { status: 404, path: 'categoryId' });
    }
    updateSet.categoryId = data.categoryId;
  }

  if (data.name !== undefined && updateCheck(data.name, findResult.name)) {
    updateSet.name = data.name;
  }

  // If name or categoryId changed, regenerate SKU
  if (updateSet.name || updateSet.categoryId) {
    const targetCategoryId = updateSet.categoryId || findResult.categoryId;
    const targetName = updateSet.name || findResult.name;
    updateSet.sku = await generateSubcategorySku(targetCategoryId, targetName);
  }

  if (data.description !== undefined && updateCheck(data.description, findResult.description)) {
    updateSet.description = data.description || null;
  }

  if (data.images !== undefined && updateCheck(data.images, findResult.images)) {
    updateSet.images = data.images || null;
  }

  const updatedResult = await db.subcategory.update({
    where: { id },
    data: updateSet,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.subcategory.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Subcategory not found', { status: 404 });

  const deletedResult = await db.subcategory.delete({
    where: { id },
  });

  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.subcategory.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.subcategory.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
  });
  if (!result) throw new AppError('Subcategory not found', { status: 404 });

  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
  categoryId?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.subcategory.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    }),
    db.subcategory.count({ where }),
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
  const items = await db.subcategory.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: {
        select: { sku: true },
      },
    },
  });
  const headers = ['sku', 'categorysku', 'name', 'url', 'description'];
  const rows = items.map((s) => ({
    sku: s.sku,
    categorysku: s.category?.sku || '',
    name: s.name,
    url: s.images || '',
    description: s.description || '',
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

