import { z } from 'zod';

export const createSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(255).describe('The name of the state'),
      countryId: z.string().uuid('Invalid Country ID').describe('The UUID of the country this state belongs to'),
      subdivisionCode: z.string().min(1).max(10).describe('The ISO 3166-2 subdivision code (e.g. CA, NY, MH)'),
      tz: z.string().optional().nullable().describe('The state timezone (optional)'),
      flag: z.string().optional().nullable().describe('The state flag emoji/URL (optional)'),
    })
    .describe('Request body parameters for creating a new state'),
});

export const createManySchema = z.object({
  body: z
    .array(
      z.object({
        name: z.string().min(2).max(255),
        countryId: z.string().uuid('Invalid Country ID'),
        subdivisionCode: z.string().min(1).max(10),
        tz: z.string().optional().nullable(),
        flag: z.string().optional().nullable(),
      })
    )
    .min(1)
    .describe('An array of state objects to be created in bulk'),
});

export const updateSchema = z.object({
  params: z
    .object({
      id: z.string().uuid('Invalid ID').describe('The unique UUID of the state to update'),
    })
    .describe('URL parameters containing the target state ID'),
  body: z
    .object({
      name: z.string().min(2).max(255).optional(),
      countryId: z.string().uuid('Invalid Country ID').optional(),
      subdivisionCode: z.string().min(1).max(10).optional(),
      tz: z.string().optional().nullable(),
      flag: z.string().optional().nullable(),
    })
    .describe('Request body parameters containing the fields of the state to update'),
});

export const deleteSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the state to delete'),
    })
    .describe('URL parameters containing the target state ID to delete'),
});

export const deleteManySchema = z.object({
  body: z.object({
    ids: z.array(z.uuid()).min(1),
  }),
});

export const getSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the state to retrieve'),
    })
    .describe('URL parameters containing the target state ID to retrieve'),
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
        .describe('Sorting direction. Defaults to "desc".'),
      orderBy: z
        .string()
        .optional()
        .transform((val) => (val === '' || val === undefined ? 'createdAt' : val))
        .default('createdAt')
        .describe('The schema field name by which to order the results.'),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().min(0))
        .describe('The page number. 0 retrieves all. Defaults to 1.'),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().min(1).max(100))
        .describe('The maximum number of states per page. Defaults to 10.'),
      search: z
        .string()
        .optional()
        .describe('Search query to filter states by name.'),
      countryId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter states by country ID.'),
    })
    .describe('Query parameters for listing states'),
});

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
