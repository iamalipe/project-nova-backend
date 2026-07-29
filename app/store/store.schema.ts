import { z } from 'zod';

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    storeCode: z.string().length(6, 'Store code must be exactly 6 characters').optional(),
    addressLine1: z.string().min(1),
    zip: z.string().min(1),
    stateId: z.string().uuid().optional(),
    stateSubdivisionCode: z.string().optional(),
    countryId: z.string().uuid().optional(),
    countryCode3: z.string().optional(),
    locationMapLink: z.string().url().optional().nullable().or(z.literal('')),
    images: z.array(z.string()).optional().default([]),
    description: z.string().optional().nullable(),
    yearlyUpkeep: z.coerce.number().min(0),
  }),
});

export const createManySchema = z.object({
  body: z.array(
    z.object({
      name: z.string().min(1).max(255),
      storeCode: z.string().length(6).optional(),
      addressLine1: z.string().min(1),
      zip: z.string().min(1),
      stateId: z.string().uuid().optional(),
      stateSubdivisionCode: z.string().optional(),
      countryId: z.string().uuid().optional(),
      countryCode3: z.string().optional(),
      locationMapLink: z.string().url().optional().nullable().or(z.literal('')),
      images: z.array(z.string()).optional().default([]),
      description: z.string().optional().nullable(),
      yearlyUpkeep: z.coerce.number().min(0),
    })
  ).min(1),
});

export const updateSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    storeCode: z.string().length(6).optional(),
    addressLine1: z.string().min(1).optional(),
    zip: z.string().min(1).optional(),
    stateId: z.string().uuid().optional(),
    countryId: z.string().uuid().optional(),
    locationMapLink: z.string().url().optional().nullable().or(z.literal('')),
    images: z.array(z.string()).optional(),
    description: z.string().optional().nullable(),
    yearlyUpkeep: z.coerce.number().min(0).optional(),
  }),
});

export const deleteSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const deleteManySchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1),
  }),
});

export const getSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getAllSchema = z.object({
  query: z.object({
    order: z
      .string()
      .optional()
      .transform((val) => (val === 'asc' ? 'asc' : 'desc'))
      .default('desc'),
    orderBy: z
      .string()
      .optional()
      .transform((val) => (val || 'createdAt'))
      .default('createdAt'),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().min(0))
      .default(1),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().min(1).max(100))
      .default(10),
    search: z.string().optional(),
    countryId: z.string().uuid().optional(),
    stateId: z.string().uuid().optional(),
  }),
});

export type createSchemaType = z.infer<typeof createSchema>;
export type createManySchemaType = z.infer<typeof createManySchema>;
export type updateSchemaType = z.infer<typeof updateSchema>;
export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
