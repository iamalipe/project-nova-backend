import { z } from 'zod';

export const createSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(255).describe('The name of the subcategory'),
      categoryId: z.string().uuid('Invalid Category ID').describe('The UUID of the parent category'),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe('A detailed description of the subcategory (optional)'),
      images: z
        .string()
        .url('Invalid image URL')
        .optional()
        .or(z.literal(''))
        .describe('An optional URL to an image for the subcategory'),
    })
    .describe('Request body parameters for creating a new subcategory'),
});

export const createManySchema = z.object({
  body: z
    .array(
      z.object({
        name: z.string().min(2).max(255).describe('The name of the subcategory'),
        categoryId: z.string().uuid('Invalid Category ID').describe('The UUID of the parent category'),
        description: z
          .string()
          .max(2000)
          .optional()
          .describe('A detailed description of the subcategory (optional)'),
        images: z
          .string()
          .url('Invalid image URL')
          .optional()
          .or(z.literal(''))
          .describe('An optional URL to an image for the subcategory'),
      }),
    )
    .min(1)
    .describe('An array of subcategory objects to be created in bulk'),
});

export const updateSchema = z.object({
  params: z
    .object({
      id: z
        .string()
        .uuid('Invalid ID')
        .describe('The unique UUID of the subcategory to update'),
    })
    .describe('URL parameters containing the target subcategory ID'),
  body: z
    .object({
      name: z
        .string()
        .min(2)
        .max(255)
        .optional()
        .describe('The updated name of the subcategory (optional)'),
      categoryId: z
        .string()
        .uuid('Invalid Category ID')
        .optional()
        .describe('The updated category UUID (optional)'),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe('The updated detailed description of the subcategory (optional)'),
      images: z
        .string()
        .url('Invalid image URL')
        .optional()
        .or(z.literal(''))
        .describe('The updated URL to an image for the subcategory (optional)'),
    })
    .describe('Request body parameters containing the fields of the subcategory to update'),
});

export const deleteSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the subcategory to delete'),
    })
    .describe('URL parameters containing the target subcategory ID to delete'),
});

export const deleteManySchema = z.object({
  body: z.object({
    ids: z.array(z.uuid()).min(1),
  }),
});

export const getSchema = z.object({
  params: z
    .object({
      id: z.uuid().describe('The unique UUID of the subcategory to retrieve'),
    })
    .describe('URL parameters containing the target subcategory ID to retrieve'),
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
        .describe('Sorting direction ("asc" or "desc"). Defaults to "desc".'),
      orderBy: z
        .string()
        .optional()
        .transform((val) =>
          val === '' || val === undefined ? 'createdAt' : val,
        )
        .default('createdAt')
        .describe('The schema field name by which to order the results. Defaults to "createdAt".'),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().min(0))
        .describe('The page number of results to retrieve. A value of 0 retrieves all. Defaults to 1.'),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().min(1).max(100))
        .describe('The maximum number of subcategories to return per page. Defaults to 10.'),
      search: z
        .string()
        .optional()
        .describe('A text search query string to filter subcategories by name or description.'),
      categoryId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter subcategories by parent category ID (optional).'),
    })
    .describe('Query parameters for paginating, sorting, and searching subcategories'),
});

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;

// --- OUTPUT SCHEMAS ---

export const singleOutputSchema = z
  .object({
    id: z.uuid().describe('The unique UUID of the subcategory'),
    name: z.string().describe('The name of the subcategory'),
    categoryId: z.uuid().describe('The UUID of the parent category'),
    sku: z.string().describe('The 4-character auto-generated SKU'),
    description: z.string().nullable().describe('A description of the subcategory'),
    images: z.string().nullable().describe('A URL of an image for the subcategory'),
    createdAt: z.string().describe('ISO timestamp of creation'),
    updatedAt: z.string().describe('ISO timestamp of last update'),
    category: z
      .object({
        id: z.uuid(),
        name: z.string(),
        sku: z.string(),
      })
      .optional(),
  })
  .describe('The schema of a subcategory object');

export const listOutputSchema = z
  .object({
    data: z.array(singleOutputSchema).describe('The list of subcategories'),
    pagination: z
      .object({
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
        current: z.number().int(),
      })
      .describe('Pagination metadata'),
    sort: z
      .object({
        order: z.enum(['asc', 'desc']),
        orderBy: z.string(),
      })
      .describe('Sorting metadata'),
  })
  .describe('The schema of a paginated list subcategories response');
