import type { Context } from 'hono';
import { Hono } from 'hono';
import z from 'zod';
import { validateRequest } from '../../middlewares/validate.middleware';
import { Role } from '../../prisma-generated/enums';
import { db } from '../../services/prisma.service';

const getAllSchema = z.object({
  query: z
    .object({
      order: z
        .string()
        .optional()
        .refine((val) => !val || ['asc', 'desc'].includes(val), {
          message: "Order must be 'asc' or 'desc'",
        })
        .transform((val) => (val === '' || val === undefined ? 'desc' : val))
        .default('desc')
        .describe('Sorting direction, either "asc" or "desc".'),
      orderBy: z
        .string()
        .optional()
        .transform((val) =>
          val === '' || val === undefined ? 'createdAt' : val,
        )
        .default('createdAt')
        .describe('The field name by which to order results.'),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().min(0))
        .describe('The page number to retrieve.'),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().min(1).max(100))
        .describe('Maximum number of users per page.'),
      search: z
        .string()
        .optional()
        .describe(
          'A text search query to filter users by name, email, or role.',
        ),
    })
    .describe('Query parameters for listing users'),
});
type getAllSchemaType = z.infer<typeof getAllSchema>;

const router = new Hono();

router.get('/user-test', validateRequest(getAllSchema), async (c: Context) => {
  const query = c.get('query') as unknown as getAllSchemaType['query'];
  // -------- DB Query --------
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
  const skip = page > 0 ? (page - 1) * limit : 0;
  // const data = [];
  const data = await db.user.findMany({
    where,
    orderBy: orderByStage,
    skip: page > 0 ? skip : undefined,
    take: page > 0 ? limit : undefined,
    include: {
      country: true,
      state: true,
    },
    omit: { password: true },
  });

  console.log('where', where);

  const countPromise =
    Object.keys(where).length === 0
      ? db.$queryRaw<
          { estimate: string }[]
        >`SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'User'`.then(
          (res) => Number(res[0]?.estimate || 0),
        )
      : db.user.count({ where });
  // const total = 0;
  const total = await countPromise;
  // const total = await db.user.count({ where });
  // const total = await db.user.count();

  // const [data, total] = await Promise.all([
  //   db.user.findMany({
  //     where,
  //     orderBy: orderByStage,
  //     skip: page > 0 ? skip : undefined,
  //     take: page > 0 ? limit : undefined,
  //     include: {
  //       country: true,
  //       state: true,
  //     },
  //     omit: { password: true },
  //   }),
  //   db.user.count({ where }),
  // ]);

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
  // -------- DB Query --------

  return c.json({
    success: true,
    data: data,
    sort: sort,
    pagination: pagination,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
});

export default router;
