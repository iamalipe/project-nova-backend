import { createMiddleware } from 'hono/factory';
import { ZodType } from 'zod';

export const validateRequest = (schema: ZodType) => {
  return createMiddleware(async (c, next) => {
    let body = {};
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await c.req.json().catch(() => ({}));
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      body = await c.req.parseBody().catch(() => ({}));
    }

    const parsedData: any = await schema.parseAsync({
      body: body,
      query: c.req.query(),
      params: c.req.param(),
    });

    // Spread them into individual context variables
    c.set('body', parsedData.body || {});
    c.set('query', parsedData.query || {});
    c.set('params', parsedData.params || {});

    await next();
  });
};
