import { z } from 'zod';

export const deleteSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid ID').describe('The unique UUID of the user to delete'),
  }).describe('URL parameters containing the target user ID to delete'),
});

export const deleteManySchema = z.object({
  body: z.object({
    ids: z.array(z.uuid()).min(1),
  }).describe('Request body containing array of user IDs to delete'),
});

export const getSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid ID').describe('The unique UUID of the user to retrieve'),
  }).describe('URL parameters containing the target user ID to retrieve'),
});

export const getAllSchema = z.object({
  query: z.object({
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
      .transform((val) => (val === '' || val === undefined ? 'createdAt' : val))
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
      .describe('A text search query to filter users by name, email, or role.'),
  }).describe('Query parameters for listing users'),
});

export type deleteSchemaType = z.infer<typeof deleteSchema>;
export type deleteManySchemaType = z.infer<typeof deleteManySchema>;
export type getSchemaType = z.infer<typeof getSchema>;
export type getAllSchemaType = z.infer<typeof getAllSchema>;
