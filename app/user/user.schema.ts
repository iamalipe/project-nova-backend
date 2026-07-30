import { z } from 'zod';
import { Role } from '../../prisma-generated/client';

export const userBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional().nullable(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional()
    .nullable(),
  profileImage: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional().default(Role.GUEST),
  salary: z.coerce.number().nonnegative().optional().nullable(),
  countryId: z.string().uuid().optional().nullable(),
  stateId: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
});

export const createSchema = z.object({
  body: userBodySchema,
});

export const createManySchema = z.object({
  body: z.array(userBodySchema),
});

export const updateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID'),
  }),
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional().nullable(),
    password: z.string().min(6).optional().nullable(),
    profileImage: z.string().optional().nullable(),
    role: z.nativeEnum(Role).optional(),
    salary: z.coerce.number().nonnegative().optional().nullable(),
    countryId: z.string().uuid().optional().nullable(),
    stateId: z.string().uuid().optional().nullable(),
    address: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
  }),
});

export const deleteSchema = z.object({
  params: z
    .object({
      id: z
        .string()
        .uuid('Invalid ID')
        .describe('The unique UUID of the user to delete'),
    })
    .describe('URL parameters containing the target user ID to delete'),
});

export const deleteManySchema = z.object({
  body: z
    .object({
      ids: z.array(z.string().uuid()).min(1),
    })
    .describe('Request body containing array of user IDs to delete'),
});

export const getSchema = z.object({
  params: z
    .object({
      id: z
        .string()
        .uuid('Invalid ID')
        .describe('The unique UUID of the user to retrieve'),
    })
    .describe('URL parameters containing the target user ID to retrieve'),
});

export const getAllSchema = z.object({
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
        .pipe(z.number().min(1))
        .describe('The page number to retrieve.'),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().min(1).max(1000))
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

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
