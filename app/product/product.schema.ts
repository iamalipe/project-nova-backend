import { z } from 'zod';

export const createSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(255).describe('The name of the product'),
      description: z
        .string()
        .max(2000)
        .optional()
        .describe('A detailed description of the product (optional)'),
      subcategoryId: z
        .string()
        .uuid('Invalid Subcategory ID')
        .describe('The subcategory classification of the product'),
      mrp: z
        .number()
        .gt(0)
        .describe('The Maximum Retail Price (MRP) of the product'),
      mop: z
        .number()
        .gt(0)
        .describe('The Market Operating Price (MOP) of the product'),
      images: z
        .string()
        .url('Invalid image URL')
        .optional()
        .or(z.literal(''))
        .describe('An optional URL to an image for the product'),
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
          .max(2000)
          .optional()
          .describe('A detailed description of the product (optional)'),
        subcategoryId: z
          .string()
          .uuid('Invalid Subcategory ID')
          .describe('The subcategory classification of the product'),
        mrp: z
          .number()
          .gt(0)
          .describe('The Maximum Retail Price (MRP) of the product'),
        mop: z
          .number()
          .gt(0)
          .describe('The Market Operating Price (MOP) of the product'),
        images: z
          .string()
          .url('Invalid image URL')
          .optional()
          .or(z.literal(''))
          .describe('An optional URL to an image for the product'),
      }),
    )
    .min(1)
    .describe('An array of product objects to be created in bulk'),
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
        .max(2000)
        .optional()
        .describe('The updated detailed description of the product (optional)'),
      subcategoryId: z
        .string()
        .uuid('Invalid Subcategory ID')
        .optional()
        .describe('The updated subcategory classification of the product (optional)'),
      mrp: z
        .number()
        .gt(0)
        .optional()
        .describe('The updated Maximum Retail Price of the product (optional)'),
      mop: z
        .number()
        .gt(0)
        .optional()
        .describe('The updated Market Operating Price of the product (optional)'),
      images: z
        .string()
        .url('Invalid image URL')
        .optional()
        .or(z.literal(''))
        .describe('The updated URL to an image for the product (optional)'),
    })
    .describe('Request body parameters containing the fields of the product to update'),
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
        .describe('Sorting direction, either "asc" or "desc". Defaults to "desc".'),
      orderBy: z
        .string()
        .optional()
        .transform((val) =>
          val === '' || val === undefined ? 'createdAt' : val,
        )
        .default('createdAt')
        .describe('The schema field name by which to order results. Defaults to "createdAt".'),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().min(0))
        .describe('The page number. A value of 0 retrieves all. Defaults to 1.'),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().min(1).max(100))
        .describe('The maximum number of products to return per page. Defaults to 10.'),
      search: z
        .string()
        .optional()
        .describe('A text search query string to filter products by their name, description, or SKU.'),
      subcategoryId: z
        .string()
        .uuid()
        .optional()
        .describe('Filter products by subcategory ID.'),
    })
    .describe('Query parameters for paginating, sorting, and searching products'),
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
    id: z.uuid().describe('The unique UUID of the product'),
    name: z.string().describe('The name of the product'),
    description: z.string().nullable().describe('A detailed description of the product'),
    subcategoryId: z.uuid().describe('The subcategory UUID'),
    sku: z.string().describe('The 6-character auto-generated SKU'),
    mrp: z.number().describe('Maximum Retail Price (MRP)'),
    mop: z.number().describe('Market Operating Price (MOP)'),
    images: z.string().nullable().describe('Product image URL'),
    userId: z.uuid().describe('The owner user UUID of the product'),
    createdAt: z.string().describe('ISO timestamp of creation'),
    updatedAt: z.string().describe('ISO timestamp of last update'),
    subcategory: z
      .object({
        id: z.uuid(),
        name: z.string(),
        sku: z.string(),
        category: z.object({
          id: z.uuid(),
          name: z.string(),
          sku: z.string(),
        }),
      })
      .optional(),
  })
  .describe('The schema of a product object');

export const bulkCreateOutputSchema = z
  .object({
    success: z.array(singleOutputSchema),
    failed: z.array(z.any()),
  })
  .describe('The schema of a bulk product creation result');

export const bulkDeleteOutputSchema = z
  .object({
    count: z.number().int().describe('The number of products deleted'),
  })
  .describe('The schema of a bulk product deletion result');

export const listOutputSchema = z
  .object({
    data: z
      .array(singleOutputSchema)
      .describe('The list of products for the current page'),
    pagination: z
      .object({
        page: z.number().int().describe('Current page number'),
        limit: z.number().int().describe('Maximum number of items per page'),
        total: z
          .number()
          .int()
          .describe('Total number of matching products in the database'),
        current: z
          .number()
          .int()
          .describe('Number of items on the current page'),
      })
      .describe('Pagination metadata'),
    sort: z
      .object({
        order: z.enum(['asc', 'desc']).describe('Sorting order direction'),
        orderBy: z.string().describe('The field used to sort the products'),
      })
      .describe('Sorting metadata'),
  })
  .describe('The schema of a paginated list products response');

export type singleOutputSchemaType = z.infer<typeof singleOutputSchema>;
export type bulkCreateOutputSchemaType = z.infer<typeof bulkCreateOutputSchema>;
export type bulkDeleteOutputSchemaType = z.infer<typeof bulkDeleteOutputSchema>;
export type listOutputSchemaType = z.infer<typeof listOutputSchema>;
