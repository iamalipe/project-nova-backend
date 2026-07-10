import { zValidator } from '@hono/zod-validator';
import { ZodSchema } from 'zod';

// This hook tells Hono: "If validation fails, throw the error so the globalErrorHandler can catch and format it."
const customHook = (result: any) => {
  if (!result.success) {
    throw result.error; // Throws the ZodError
  }
};

// Export helpers for the different parts of the request
export const validateBody = (schema: ZodSchema) =>
  zValidator('json', schema, customHook);
export const validateQuery = (schema: ZodSchema) =>
  zValidator('query', schema, customHook);
export const validateParams = (schema: ZodSchema) =>
  zValidator('param', schema, customHook);

// const productRouter = new Hono();

// const createProductSchema = z.object({
//   name: z.string().min(3),
//   price: z.number().positive(),
// });

// const productIdSchema = z.object({
//   id: z.string().uuid(),
// });

// productRouter.put(
//   '/:id',
//   validateParams(productIdSchema),
//   validateBody(createProductSchema),
//   async (c) => {
//     const { id } = c.req.valid('param'); // Typed as { id: string }
//     const body = c.req.valid('json');    // Typed as { name: string, price: number }

//     return c.json({ success: true, id, body });
//   }
// );
