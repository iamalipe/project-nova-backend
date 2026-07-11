import { z } from 'zod';

export const createSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(255).describe('The name of the product'),
      description: z
        .string()
        .min(2)
        .max(2000)
        .describe('A detailed description of the product'),
      category: z
        .string()
        .min(2)
        .max(255)
        .describe('The category classification of the product'),
      price: z
        .number()
        .gt(0)
        .describe('The price of the product (must be greater than 0)'),
    })
    .describe('Request body parameters for creating a new product'),
});

export const createManySchema = z.object({
  body: z
    .array(
      z.object({
        name: z.string().min(2).max(255).describe('The name of the product'),
        description: z
          .string()
          .min(2)
          .max(2000)
          .describe('A detailed description of the product'),
        category: z
          .string()
          .min(2)
          .max(255)
          .describe('The category classification of the product'),
        price: z
          .number()
          .gt(0)
          .describe('The price of the product (must be greater than 0)'),
      }),
    )
    .min(1)
    .describe(
      'An array of product objects to be created in bulk (at least 1 product is required)',
    ),
});

export const updateSchema = z.object({
  params: z
    .object({
      id: z
        .string()
        .uuid('Invalid ID')
        .describe('The unique UUID of the product to update'),
    })
    .describe('URL parameters containing the target product ID'),
  body: z
    .object({
      name: z
        .string()
        .min(2)
        .max(255)
        .optional()
        .describe('The updated name of the product (optional)'),
      description: z
        .string()
        .min(2)
        .max(2000)
        .optional()
        .describe('The updated detailed description of the product (optional)'),
      category: z
        .string()
        .min(2)
        .max(255)
        .optional()
        .describe(
          'The updated category classification of the product (optional)',
        ),
      price: z
        .number()
        .gt(0)
        .optional()
        .describe(
          'The updated price of the product (optional, must be greater than 0)',
        ),
    })
    .describe(
      'Request body parameters containing the fields of the product to update',
    ),
});

export const deleteSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the product to delete'),
    })
    .describe('URL parameters containing the target product ID to delete'),
});

export const deleteManySchema = z.object({
  body: z.object({
    ids: z.array(z.uuid()).min(1),
  }),
});

export const getSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the product to retrieve'),
    })
    .describe('URL parameters containing the target product ID to retrieve'),
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
        .describe(
          'Sorting direction, either "asc" for ascending or "desc" for descending. Defaults to "desc".',
        ),
      orderBy: z
        .string()
        .optional()
        .transform((val) =>
          val === '' || val === undefined ? 'createdAt' : val,
        )
        .default('createdAt')
        .describe(
          'The schema field name by which to order the results (e.g., "createdAt", "price", "name"). Defaults to "createdAt".',
        ),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().min(0))
        .describe(
          'The page number of results to retrieve. A value of 0 retrieves all records (disables pagination). Defaults to 1.',
        ),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().min(1).max(100))
        .describe(
          'The maximum number of products to return per page (must be between 1 and 100). Defaults to 10.',
        ),
      search: z
        .string()
        .optional()
        .describe(
          'A text search query string to filter products by their name, description, or category.',
        ),
    })
    .describe(
      'Query parameters for paginating, sorting, and searching products',
    ),
});

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
