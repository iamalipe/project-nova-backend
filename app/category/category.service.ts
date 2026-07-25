import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import {
  serializeDatesAndDecimals,
  updateCheck,
} from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

// Helper to generate a unique 2-char category SKU using name as ref
export const generateCategorySku = async (name: string): Promise<string> => {
  const cleanName = name.replace(/[^A-Z]/gi, '').toUpperCase();
  const candidates: string[] = [];

  if (cleanName.length >= 2) {
    candidates.push(cleanName.slice(0, 2));
    for (let i = 2; i < cleanName.length; i++) {
      candidates.push(cleanName[0] + cleanName[i]);
    }
  } else if (cleanName.length === 1) {
    for (let charCode = 65; charCode <= 90; charCode++) {
      candidates.push(cleanName[0] + String.fromCharCode(charCode));
    }
  }

  const firstChar = cleanName.length > 0 ? cleanName[0] : 'A';
  for (let charCode = 65; charCode <= 90; charCode++) {
    candidates.push(firstChar + String.fromCharCode(charCode));
  }

  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      candidates.push(String.fromCharCode(i) + String.fromCharCode(j));
    }
  }

  for (const sku of candidates) {
    const exists = await db.category.findUnique({
      where: { sku },
    });
    if (!exists) {
      return sku;
    }
  }

  throw new AppError('Could not generate a unique Category SKU', { status: 400 });
};

const createOne = async (data: {
  name: string;
  description?: string;
  images?: string;
}) => {
  const nameExists = await db.category.findUnique({
    where: { name: data.name },
  });
  if (nameExists) {
    throw new AppError('Category with this name already exists', { status: 400, path: 'name' });
  }

  const sku = await generateCategorySku(data.name);

  const result = await db.category.create({
    data: {
      name: data.name,
      sku,
      description: data.description || null,
      images: data.images || null,
    },
  });

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    description?: string;
    images?: string;
  }[],
) => {
  // Filter unique name in bulk request
  const uniqueArray = data.filter(
    (obj, index, self) =>
      index === self.findIndex((o) => o.name.toLowerCase() === obj.name.toLowerCase()),
  );

  const existingCategories = await db.category.findMany({
    where: {
      name: { in: uniqueArray.map((d) => d.name), mode: 'insensitive' },
    },
    select: { name: true },
  });

  const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));

  const toCreate = uniqueArray.filter((obj) => !existingNames.has(obj.name.toLowerCase()));
  const failed = uniqueArray.filter((obj) => existingNames.has(obj.name.toLowerCase()));

  const success: any[] = [];

  for (const item of toCreate) {
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
    description?: string;
    images?: string;
  },
) => {
  const findResult = await db.category.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Category not found', { status: 404 });

  const updateSet: any = {};

  if (data.name !== undefined && updateCheck(data.name, findResult.name)) {
    // Unique check
    const nameExists = await db.category.findFirst({
      where: { name: data.name, id: { not: id } },
    });
    if (nameExists) {
      throw new AppError('Category with this name already exists', { status: 400, path: 'name' });
    }
    updateSet.name = data.name;
    // Regenerate SKU if name changes? The prompt says SKU generated using name as reference.
    // Usually changing name regenerates SKU to stay consistent.
    updateSet.sku = await generateCategorySku(data.name);
  }

  if (data.description !== undefined && updateCheck(data.description, findResult.description)) {
    updateSet.description = data.description || null;
  }

  if (data.images !== undefined && updateCheck(data.images, findResult.images)) {
    updateSet.images = data.images || null;
  }

  const updatedResult = await db.category.update({
    where: { id },
    data: updateSet,
  });

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.category.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('Category not found', { status: 404 });

  const deletedResult = await db.category.delete({
    where: { id },
  });

  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.category.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return serializeDatesAndDecimals(result);
};

const getOne = async (id: string) => {
  const result = await db.category.findUnique({
    where: { id },
  });
  if (!result) throw new AppError('Category not found', { status: 404 });

  return serializeDatesAndDecimals(result);
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
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
    db.category.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
    }),
    db.category.count({ where }),
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
  const items = await db.category.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const headers = ['sku', 'name', 'url', 'description'];
  const rows = items.map((c) => ({
    sku: c.sku,
    name: c.name,
    url: c.images || '',
    description: c.description || '',
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

