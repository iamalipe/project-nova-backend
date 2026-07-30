import { Role } from '../../prisma-generated/client';
import { cacheDel } from '../../services/cache.service';
import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { hashPassword } from '../../utils/auth.utils';
import { generateCsv } from '../../utils/csv.utils';

export interface UserCreateInput {
  email: string;
  firstName: string;
  lastName?: string | null;
  password?: string | null;
  profileImage?: string | null;
  role?: Role;
  salary?: number | null;
  countryId?: string | null;
  stateId?: string | null;
  address?: string | null;
  zip?: string | null;
}

export interface UserUpdateInput {
  email?: string;
  firstName?: string;
  lastName?: string | null;
  password?: string | null;
  profileImage?: string | null;
  role?: Role;
  salary?: number | null;
  countryId?: string | null;
  stateId?: string | null;
  address?: string | null;
  zip?: string | null;
}

const createOne = async (data: UserCreateInput) => {
  const existing = await db.user.findFirst({
    where: { email: { equals: data.email, mode: 'insensitive' } },
  });
  if (existing) {
    throw new AppError('Email already exists', { status: 400, path: 'email' });
  }

  const hashedPassword = data.password
    ? await hashPassword(data.password)
    : await hashPassword('Password123!');

  const result = await db.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName || null,
      password: hashedPassword,
      profileImage: data.profileImage || null,
      role: data.role || Role.GUEST,
      salary:
        data.salary !== undefined && data.salary !== null ? data.salary : null,
      countryId: data.countryId || null,
      stateId: data.stateId || null,
      address: data.address || null,
      zip: data.zip || null,
    },
    include: {
      country: true,
      state: true,
    },
    omit: {
      password: true,
    },
  });

  return result;
};

const createMany = async (dataList: UserCreateInput[]) => {
  const success: any[] = [];
  const failed: any[] = [];

  for (const item of dataList) {
    try {
      const created = await createOne(item);
      success.push(created);
    } catch (err: any) {
      failed.push({ item, error: err?.message || 'Failed to create user' });
    }
  }

  return {
    success,
    failed,
  };
};

const updateOne = async (id: string, data: UserUpdateInput) => {
  const findResult = await db.user.findUnique({
    where: { id },
  });
  if (!findResult) throw new AppError('User not found', { status: 404 });

  if (
    data.email &&
    data.email.toLowerCase() !== findResult.email.toLowerCase()
  ) {
    const existing = await db.user.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    });
    if (existing && existing.id !== id) {
      throw new AppError('Email already exists', {
        status: 400,
        path: 'email',
      });
    }
  }

  const dataToUpdate: any = {};
  if (data.email !== undefined) dataToUpdate.email = data.email;
  if (data.firstName !== undefined) dataToUpdate.firstName = data.firstName;
  if (data.lastName !== undefined)
    dataToUpdate.lastName = data.lastName || null;
  if (data.profileImage !== undefined)
    dataToUpdate.profileImage = data.profileImage || null;
  if (data.role !== undefined) dataToUpdate.role = data.role;
  if (data.salary !== undefined)
    dataToUpdate.salary = data.salary !== null ? data.salary : null;
  if (data.countryId !== undefined)
    dataToUpdate.countryId = data.countryId || null;
  if (data.stateId !== undefined) dataToUpdate.stateId = data.stateId || null;
  if (data.address !== undefined) dataToUpdate.address = data.address || null;
  if (data.zip !== undefined) dataToUpdate.zip = data.zip || null;
  if (data.password) {
    dataToUpdate.password = await hashPassword(data.password);
  }

  const updatedResult = await db.user.update({
    where: { id },
    data: dataToUpdate,
    include: {
      country: true,
      state: true,
    },
    omit: {
      password: true,
    },
  });

  await cacheDel([`jwt-auth-middleware-user:${id}`, `user:${id}`]);

  return updatedResult;
};

const getOne = async (id: string) => {
  const result = await db.user.findUnique({
    where: { id },
    include: {
      country: true,
      state: true,
    },
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
      (r) => r.toLowerCase() === query.search?.toLowerCase(),
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
  const skip = (page - 1) * limit;

  const countPromise =
    Object.keys(where).length === 0
      ? db.$queryRaw<
          { estimate: string }[]
        >`SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'User'`.then(
          (res) => Number(res[0]?.estimate || 0),
        )
      : db.user.count({ where });

  const [data, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: orderByStage,
      skip,
      take: limit,
      include: {
        country: true,
        state: true,
      },
      omit: { password: true },
    }),
    countPromise,
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

const exportCsv = async () => {
  const items = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      country: { select: { code2: true } },
      state: { select: { subdivisionCode: true } },
    },
    omit: { password: true },
  });
  const headers = [
    'email',
    'firstName',
    'lastName',
    'role',
    'salary',
    'countrycode2',
    'statecode2',
    'address',
    'zip',
    'password',
  ];
  const rows = items.map((u) => ({
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName || '',
    role: u.role,
    salary: u.salary ?? '',
    countrycode2: u.country?.code2 || '',
    statecode2: u.state?.subdivisionCode || '',
    address: u.address || '',
    zip: u.zip || '',
    password: '',
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
