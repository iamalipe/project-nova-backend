import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { Role } from '../../prisma-generated/client';

const getOne = async (id: string) => {
  const result = await db.user.findUnique({
    where: { id },
    omit: { password: true },
  });

  if (!result) throw new AppError('record not found', { status: 404 });

  return result;
};

const deleteOne = async (id: string, currentUserId: string) => {
  if (id === currentUserId) {
    throw new AppError('Cannot delete yourself', { status: 400 });
  }
  const findResult = await db.user.findUnique({
    where: { id },
  });

  if (!findResult) throw new AppError('record not found', { status: 404 });

  const deletedResult = await db.user.delete({
    where: { id },
  });

  return deletedResult;
};

const deleteMany = async (ids: string[], currentUserId: string) => {
  if (ids.includes(currentUserId)) {
    throw new AppError('Cannot delete yourself', { status: 400 });
  }
  const result = await db.user.deleteMany({
    where: {
      id: { in: ids },
    },
  });
  return result;
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string | 'createdAt';
  order: string | 'asc' | 'desc';
  search?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  // Build match filter
  const where: any = {};
  if (query.search) {
    const matchedRole = Object.values(Role).find(
      (r) => r.toLowerCase() === query.search?.toLowerCase()
    );
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      ...(matchedRole ? [{ role: { equals: matchedRole } }] : []),
    ];
  }

  // Build sort stage
  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] =
    query.order === 'asc' ? 'asc' : 'desc';

  // Build pagination
  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      omit: { password: true },
    }),
    db.user.count({ where }),
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

export default {
  deleteOne,
  deleteMany,
  getOne,
  getAll,
};
