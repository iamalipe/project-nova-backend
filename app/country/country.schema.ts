import { z } from 'zod';

export const createSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(255).describe('The name of the country'),
      flag: z.string().min(1).describe('The emoji or URL of the flag'),
      code3: z.string().length(3).describe('The 3-letter ISO code'),
      code2: z.string().length(2).describe('The 2-letter ISO code'),
      tz: z.string().min(1).describe('The primary timezone'),
      currency3: z.string().length(3).describe('The 3-letter currency code'),
      currencySymbol: z.string().min(1).describe('The currency symbol'),
    })
    .describe('Request body parameters for creating a new country'),
});

export const createManySchema = z.object({
  body: z
    .array(
      z.object({
        name: z.string().min(2).max(255),
        flag: z.string().min(1),
        code3: z.string().length(3),
        code2: z.string().length(2),
        tz: z.string().min(1),
        currency3: z.string().length(3),
        currencySymbol: z.string().min(1),
      })
    )
    .min(1)
    .describe('An array of country objects to be created in bulk'),
});

export const updateSchema = z.object({
  params: z
    .object({
      id: z.string().uuid('Invalid ID').describe('The unique UUID of the country to update'),
    })
    .describe('URL parameters containing the target country ID'),
  body: z
    .object({
      name: z.string().min(2).max(255).optional(),
      flag: z.string().min(1).optional(),
      code3: z.string().length(3).optional(),
      code2: z.string().length(2).optional(),
      tz: z.string().min(1).optional(),
      currency3: z.string().length(3).optional(),
      currencySymbol: z.string().min(1).optional(),
    })
    .describe('Request body parameters containing the fields of the country to update'),
});

export const deleteSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the country to delete'),
    })
    .describe('URL parameters containing the target country ID to delete'),
});

export const deleteManySchema = z.object({
  body: z.object({
    ids: z.array(z.uuid()).min(1),
  }),
});

export const getSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the country to retrieve'),
    })
    .describe('URL parameters containing the target country ID to retrieve'),
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
        .describe('The maximum number of countries per page. Defaults to 10.'),
      search: z
        .string()
        .optional()
        .describe('Search query to filter countries by name.'),
    })
    .describe('Query parameters for listing countries'),
});

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
