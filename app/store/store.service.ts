import { Role } from '../../prisma-generated/client';
import { db } from '../../services/prisma.service';
import { AppError } from '../../utils/appError.utils';
import { serializeDatesAndDecimals, updateCheck } from '../../utils/general.utils';
import { generateCsv } from '../../utils/csv.utils';

const createOne = async (data: {
  name: string;
  storeCode?: string;
  addressLine1: string;
  zip: string;
  stateId?: string;
  stateSubdivisionCode?: string;
  countryId?: string;
  countryCode3?: string;
  locationMapLink?: string | null;
  images?: string[];
  description?: string | null;
  yearlyUpkeep: number;
  managerId?: string | null;
  staffIds?: string[];
}) => {
  let targetCountryId = data.countryId;
  if (!targetCountryId && data.countryCode3) {
    const country = await db.country.findFirst({
      where: { code3: { equals: data.countryCode3, mode: 'insensitive' } },
    });
    if (!country) throw new AppError(`Country code '${data.countryCode3}' not found`, { status: 404, path: 'countryCode3' });
    targetCountryId = country.id;
  }
  if (!targetCountryId) {
    throw new AppError('Country ID or countryCode3 is required', { status: 400, path: 'countryId' });
  }

  const countryObj = await db.country.findUnique({ where: { id: targetCountryId } });
  const cc2 = countryObj?.code2?.toUpperCase() || 'XX';

  let storeCode = data.storeCode;
  if (!storeCode) {
    const totalStoresCount = await db.store.count();
    storeCode = `S${cc2}${(totalStoresCount + 1).toString().padStart(6, '0')}`;
  }

  const existing = await db.store.findUnique({
    where: { storeCode },
  });
  if (existing) {
    throw new AppError('Store code already exists', { status: 400, path: 'storeCode' });
  }

  let targetStateId = data.stateId;
  if (!targetStateId && data.stateSubdivisionCode) {
    const codeParts = data.stateSubdivisionCode.split('-');
    const searchCode = codeParts.length > 1 ? codeParts[1] : codeParts[0];

    const state = await db.countryState.findFirst({
      where: {
        subdivisionCode: { equals: searchCode, mode: 'insensitive' },
        countryId: targetCountryId,
      },
    });
    if (!state) throw new AppError(`State subdivision code '${data.stateSubdivisionCode}' not found`, { status: 404, path: 'stateSubdivisionCode' });
    targetStateId = state.id;
  }
  if (!targetStateId) {
    throw new AppError('State ID or stateSubdivisionCode is required', { status: 400, path: 'stateId' });
  }

  const result = await db.store.create({
    data: {
      name: data.name,
      storeCode: storeCode,
      addressLine1: data.addressLine1,
      zip: data.zip,
      stateId: targetStateId,
      countryId: targetCountryId,
      managerId: data.managerId || null,
      staffIds: data.staffIds || [],
      locationMapLink: data.locationMapLink || null,
      images: data.images || [],
      description: data.description || null,
      yearlyUpkeep: data.yearlyUpkeep,
    },
  });

  const sanitizedStoreCode = storeCode.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (data.managerId) {
    const mgr = await db.user.findUnique({ where: { id: data.managerId } });
    if (mgr) {
      const newEmail = mgr.email.includes('.manager.')
        ? mgr.email
        : `manager.${sanitizedStoreCode}.${Date.now()}@yopmail.com`;
      await db.user.update({
        where: { id: data.managerId },
        data: {
          role: Role.STORE_MANAGER,
          countryId: targetCountryId,
          stateId: targetStateId,
          email: newEmail,
        },
      });
    }
  }

  if (data.staffIds && data.staffIds.length > 0) {
    for (let i = 0; i < data.staffIds.length; i++) {
      const sId = data.staffIds[i];
      const stf = await db.user.findUnique({ where: { id: sId } });
      if (stf) {
        const newEmail = stf.email.includes('.staff.')
          ? stf.email
          : `staff.${sanitizedStoreCode}.${i + 1}.${Date.now()}@yopmail.com`;
        await db.user.update({
          where: { id: sId },
          data: {
            role: Role.STAFF,
            countryId: targetCountryId,
            stateId: targetStateId,
            email: newEmail,
          },
        });
      }
    }
  }

  return serializeDatesAndDecimals(result);
};

const createMany = async (
  data: {
    name: string;
    storeCode?: string;
    addressLine1: string;
    zip: string;
    stateId?: string;
    stateSubdivisionCode?: string;
    countryId?: string;
    countryCode3?: string;
    locationMapLink?: string | null;
    images?: string[];
    description?: string | null;
    yearlyUpkeep: number;
  }[],
) => {
  const success: any[] = [];
  const failed: any[] = [];

  let codeOffset = 0;
  const initialCount = await db.store.count();
  for (const item of data) {
    try {
      let generatedCode = item.storeCode;
      if (!generatedCode) {
        let countryCc2 = 'XX';
        let cId = item.countryId;
        if (!cId && item.countryCode3) {
          const c = await db.country.findFirst({ where: { code3: { equals: item.countryCode3, mode: 'insensitive' } } });
          cId = c?.id;
        }
        if (cId) {
          const countryObj = await db.country.findUnique({ where: { id: cId } });
          if (countryObj) countryCc2 = countryObj.code2.toUpperCase();
        }
        generatedCode = `S${countryCc2}${(initialCount + 1 + codeOffset).toString().padStart(6, '0')}`;
      }

      const created = await createOne({
        ...item,
        storeCode: generatedCode,
      });
      success.push(created);
      codeOffset++;
    } catch (err) {
      failed.push(item);
    }
  }

  return { success, failed };
};

const updateOne = async (
  id: string,
  data: {
    name?: string;
    storeCode?: string;
    addressLine1?: string;
    zip?: string;
    stateId?: string;
    countryId?: string;
    locationMapLink?: string | null;
    images?: string[];
    description?: string | null;
    yearlyUpkeep?: number;
    managerId?: string | null;
    staffIds?: string[];
  },
) => {
  const findResult = await db.store.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Store not found', { status: 404 });

  if (data.storeCode && data.storeCode !== findResult.storeCode) {
    const existingCode = await db.store.findUnique({ where: { storeCode: data.storeCode } });
    if (existingCode) {
      throw new AppError('Store code already in use', { status: 400, path: 'storeCode' });
    }
  }

  const updateSet: any = {};
  if (data.name !== undefined && updateCheck(data.name, findResult.name)) updateSet.name = data.name;
  if (data.storeCode !== undefined && updateCheck(data.storeCode, findResult.storeCode)) updateSet.storeCode = data.storeCode;
  if (data.addressLine1 !== undefined && updateCheck(data.addressLine1, findResult.addressLine1)) updateSet.addressLine1 = data.addressLine1;
  if (data.zip !== undefined && updateCheck(data.zip, findResult.zip)) updateSet.zip = data.zip;
  if (data.stateId !== undefined && updateCheck(data.stateId, findResult.stateId)) updateSet.stateId = data.stateId;
  if (data.countryId !== undefined && updateCheck(data.countryId, findResult.countryId)) updateSet.countryId = data.countryId;
  if (data.locationMapLink !== undefined && updateCheck(data.locationMapLink, findResult.locationMapLink)) updateSet.locationMapLink = data.locationMapLink;
  if (data.images !== undefined) updateSet.images = data.images;
  if (data.description !== undefined && updateCheck(data.description, findResult.description)) updateSet.description = data.description;
  if (data.yearlyUpkeep !== undefined && updateCheck(data.yearlyUpkeep, findResult.yearlyUpkeep)) updateSet.yearlyUpkeep = data.yearlyUpkeep;
  if (data.managerId !== undefined) updateSet.managerId = data.managerId || null;
  if (data.staffIds !== undefined) updateSet.staffIds = data.staffIds || [];

  const updatedResult = await db.store.update({
    where: { id },
    data: updateSet,
  });

  const targetCountryId = updateSet.countryId || findResult.countryId;
  const targetStateId = updateSet.stateId || findResult.stateId;
  const sanitizedStoreCode = (updateSet.storeCode || findResult.storeCode).toLowerCase().replace(/[^a-z0-9]/g, '');

  if (data.managerId !== undefined && data.managerId) {
    const mgr = await db.user.findUnique({ where: { id: data.managerId } });
    if (mgr) {
      const newEmail = mgr.email.includes('.manager.')
        ? mgr.email
        : `manager.${sanitizedStoreCode}.${Date.now()}@yopmail.com`;
      await db.user.update({
        where: { id: data.managerId },
        data: {
          role: Role.STORE_MANAGER,
          countryId: targetCountryId,
          stateId: targetStateId,
          email: newEmail,
        },
      });
    }
  }

  if (data.staffIds !== undefined && Array.isArray(data.staffIds)) {
    for (let i = 0; i < data.staffIds.length; i++) {
      const sId = data.staffIds[i];
      const stf = await db.user.findUnique({ where: { id: sId } });
      if (stf) {
        const newEmail = stf.email.includes('.staff.')
          ? stf.email
          : `staff.${sanitizedStoreCode}.${i + 1}.${Date.now()}@yopmail.com`;
        await db.user.update({
          where: { id: sId },
          data: {
            role: Role.STAFF,
            countryId: targetCountryId,
            stateId: targetStateId,
            email: newEmail,
          },
        });
      }
    }
  }

  return serializeDatesAndDecimals(updatedResult);
};

const deleteOne = async (id: string) => {
  const findResult = await db.store.findUnique({ where: { id } });
  if (!findResult) throw new AppError('Store not found', { status: 404 });

  const deletedResult = await db.store.delete({ where: { id } });
  return serializeDatesAndDecimals(deletedResult);
};

const deleteMany = async (ids: string[]) => {
  const result = await db.store.deleteMany({ where: { id: { in: ids } } });
  return serializeDatesAndDecimals(result);
};

const fetchStoreManagerAndStaff = async (store: any) => {
  const sanitizedCode = store.storeCode.toLowerCase().replace(/[^a-z0-9]/g, '');

  let manager = null;
  if (store.managerId) {
    manager = await db.user.findUnique({
      where: { id: store.managerId },
      include: { country: true, state: true },
      omit: { password: true },
    });
  }

  if (!manager) {
    manager = await db.user.findFirst({
      where: {
        role: Role.STORE_MANAGER,
        countryId: store.countryId,
        stateId: store.stateId,
        email: { contains: `.manager.${sanitizedCode}` },
      },
      include: { country: true, state: true },
      omit: { password: true },
    });
  }

  if (!manager) {
    manager = await db.user.findFirst({
      where: {
        role: Role.STORE_MANAGER,
        countryId: store.countryId,
        stateId: store.stateId,
      },
      include: { country: true, state: true },
      omit: { password: true },
    });
  }

  let staff: any[] = [];
  if (store.staffIds && Array.isArray(store.staffIds) && store.staffIds.length > 0) {
    staff = await db.user.findMany({
      where: { id: { in: store.staffIds } },
      include: { country: true, state: true },
      omit: { password: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (staff.length === 0) {
    staff = await db.user.findMany({
      where: {
        role: Role.STAFF,
        countryId: store.countryId,
        stateId: store.stateId,
        email: { contains: `.staff.${sanitizedCode}.` },
      },
      include: { country: true, state: true },
      omit: { password: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (staff.length === 0) {
    staff = await db.user.findMany({
      where: {
        role: Role.STAFF,
        countryId: store.countryId,
        stateId: store.stateId,
      },
      include: { country: true, state: true },
      omit: { password: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  return {
    manager: manager ? serializeDatesAndDecimals(manager) : null,
    staff: serializeDatesAndDecimals(staff),
    staffCount: staff.length,
  };
};

const getOne = async (id: string) => {
  const result = await db.store.findUnique({
    where: { id },
    include: { country: true, state: true },
  });
  if (!result) throw new AppError('Store not found', { status: 404 });
  const { manager, staff, staffCount } = await fetchStoreManagerAndStaff(result);
  const serialized = serializeDatesAndDecimals(result);
  return {
    ...serialized,
    manager,
    staff,
    staffCount,
  };
};

const getAll = async (query: {
  limit: number;
  page: number;
  orderBy: string;
  order: string;
  search?: string;
  countryId?: string;
  stateId?: string;
}) => {
  const limit = parseInt(query.limit as unknown as string, 10);
  const page = parseInt(query.page as unknown as string, 10);

  const where: any = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.stateId) where.stateId = query.stateId;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { storeCode: { contains: query.search, mode: 'insensitive' } },
      { addressLine1: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const orderByStage: any = {};
  orderByStage[query.orderBy || 'createdAt'] = query.order === 'asc' ? 'asc' : 'desc';

  const skip = page > 0 ? (page - 1) * limit : 0;

  const [data, total] = await Promise.all([
    db.store.findMany({
      where,
      orderBy: orderByStage,
      skip: page > 0 ? skip : undefined,
      take: page > 0 ? limit : undefined,
      include: { country: true, state: true },
    }),
    db.store.count({ where }),
  ]);

  const enrichedData = await Promise.all(
    data.map(async (store) => {
      const { manager, staff, staffCount } = await fetchStoreManagerAndStaff(store);
      const serialized = serializeDatesAndDecimals(store);
      return {
        ...serialized,
        manager,
        staff,
        staffCount,
      };
    }),
  );

  return {
    data: enrichedData,
    pagination: { page, limit, total, current: data.length },
    sort: { order: query.order, orderBy: query.orderBy },
  };
};

const exportCsv = async () => {
  const items = await db.store.findMany({
    orderBy: { createdAt: 'desc' },
    include: { country: true, state: true },
  });
  const headers = ['name', 'storeCode', 'addressLine1', 'zip', 'countryId', 'stateId', 'countryCode3', 'stateSubdivisionCode', 'yearlyUpkeep'];
  const rows = items.map((s) => ({
    name: s.name,
    storeCode: s.storeCode,
    addressLine1: s.addressLine1,
    zip: s.zip,
    countryId: s.countryId,
    stateId: s.stateId,
    countryCode3: s.country?.code3 || '',
    stateSubdivisionCode: s.state?.subdivisionCode || '',
    yearlyUpkeep: s.yearlyUpkeep ? Number(s.yearlyUpkeep) : 0,
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

