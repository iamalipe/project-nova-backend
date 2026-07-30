import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  finalPrice: z.coerce.number().min(0, 'Final price must be >= 0'),
});

export const createSchema = z.object({
  body: z.object({
    storeId: z.string().uuid('Invalid store ID'),
    customerId: z.string().uuid('Invalid customer ID'),
    staffId: z.string().uuid('Invalid staff ID'),
    cart: z.array(cartItemSchema).min(1, 'Cart must contain at least one item'),
    finalSellPrice: z.coerce.number().min(0).optional(),
    transactionDate: z.string().datetime().optional().default(() => new Date().toISOString()),
  }),
});

export const createManySchema = z.object({
  body: z.array(
    z.object({
      storeId: z.string().uuid('Invalid store ID'),
      customerId: z.string().uuid('Invalid customer ID'),
      staffId: z.string().uuid('Invalid staff ID'),
      cart: z.array(cartItemSchema).min(1, 'Cart must contain at least one item'),
      finalSellPrice: z.coerce.number().min(0).optional(),
      transactionDate: z.string().datetime().optional().default(() => new Date().toISOString()),
    })
  ).min(1),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    storeId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    cart: z.array(cartItemSchema).min(1).optional(),
    finalSellPrice: z.coerce.number().min(0).optional(),
    transactionDate: z.string().datetime().optional(),
  }),
});

export const deleteSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const deleteManySchema = z.object({
  body: z.object({ ids: z.array(z.string().uuid()).min(1) }),
});

export const getSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const getAllSchema = z.object({
  query: z.object({
    order: z.string().optional().transform((val) => (val === 'asc' ? 'asc' : 'desc')).default('desc'),
    orderBy: z.string().optional().transform((val) => (val || 'transactionDate')).default('transactionDate'),
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).pipe(z.number().min(1)).default(1),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)).pipe(z.number().min(1).max(100)).default(10),
    search: z.string().optional(),
    productId: z.string().uuid().optional(),
    storeId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
  }),
});

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
