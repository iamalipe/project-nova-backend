import { tool } from 'ai';
import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { updateCheck } from '../../utils/general.utils';
import {
  createManySchema,
  createManySchemaType,
  createSchema,
  createSchemaType,
  deleteManySchema,
  deleteManySchemaType,
  deleteSchema,
  deleteSchemaType,
  getAllSchema,
  getAllSchemaType,
  getSchema,
  getSchemaType,
  updateSchema,
  updateSchemaType,
} from './product.schema';

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

  return result;
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

  return { success: createdProducts, failed: uniqueArrayFailed };
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

  return updatedResult;
};

const deleteOne = async (id: string, userId: string) => {
  const findResult = await db.product.findUnique({
    where: { id },
  });

  if (!findResult) throw new AppError('record not found', { status: 404 });

  const deletedResult = await db.product.delete({
    where: { id },
  });

  return deletedResult;
};

const deleteMany = async (ids: string[], userId: string) => {
  const result = await db.product.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return result;
};

const getOne = async (id: string, userId: string) => {
  const result = await db.product.findUnique({
    where: { id },
  });

  if (!result) throw new AppError('record not found', { status: 404 });

  return result;
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
    data,
    pagination,
    sort,
  };
};

const createOneProductAITool = tool({
  description:
    'Creates a single product. Use this tool when you need to create a new product entry.',
  inputSchema: createSchema,
  execute: async (input: createSchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const result = await createOne(
      {
        ...input.body,
        userId: userId,
      },
      userId,
    );

    return {
      success: true,
      data: result,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

const createManyProductAITool = tool({
  description:
    'Creates multiple products in bulk. Use this tool to batch create several products at once.',
  inputSchema: createManySchema,
  execute: async (input: createManySchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const data = input.body.map((item) => ({
      ...item,
      userId,
      price: Number(item.price),
    }));
    const result = await createMany(data, userId);

    return {
      success: true,
      data: result,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

const updateOneProductAITool = tool({
  description:
    'Updates fields of an existing product (e.g., name, description, category, price) using its unique product ID.',
  inputSchema: updateSchema,
  execute: async (input: updateSchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const result = await updateOne(input.params.id, input.body, userId);

    return {
      success: true,
      data: result,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

const deleteOneProductAITool = tool({
  description: 'Deletes an existing product by its unique product ID.',
  inputSchema: deleteSchema,
  execute: async (input: deleteSchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const result = await deleteOne(input.params.id, userId);

    return {
      success: true,
      data: result,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

const getOneProductAITool = tool({
  description:
    'Retrieves details of a single product using its unique product ID.',
  inputSchema: getSchema,
  execute: async (input: getSchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const result = await getOne(input.params.id, userId);

    return {
      success: true,
      data: result,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

const getAllProductAITool = tool({
  description:
    'Retrieves a list of products with optional search terms, pagination (page, limit), and custom sorting (order, orderBy).',
  inputSchema: getAllSchema,
  execute: async (input: getAllSchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const query = {
      limit: input.query.limit,
      page: input.query.page,
      orderBy: input.query.orderBy,
      order: input.query.order,
      userId: userId,
      search: input.query.search,
    };
    const result = await getAll(query);

    return {
      success: true,
      data: result.data,
      sort: result.sort,
      pagination: result.pagination,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

const deleteManyProductAITool = tool({
  description: 'Deletes multiple products in bulk by their unique product IDs.',
  inputSchema: deleteManySchema,
  execute: async (input: deleteManySchemaType) => {
    const userId: string = ''; // FIXME later fix this userId issue
    const result = await deleteMany(input.body.ids, userId);

    return {
      success: true,
      data: result,
      errors: [],
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  },
});

export default {
  createOne,
  createMany,
  updateOne,
  deleteOne,
  deleteMany,
  getOne,
  getAll,
  createOneProductAITool,
  createManyProductAITool,
  updateOneProductAITool,
  deleteOneProductAITool,
  deleteManyProductAITool,
  getOneProductAITool,
  getAllProductAITool,
};
