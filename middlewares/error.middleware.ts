import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception'; // 1. Import this
import { z } from 'zod';

import { Prisma } from '../prisma-generated/client';
import { logger } from '../utils/logger';

export const globalErrorHandler: ErrorHandler = (err, c) => {
  // If the error is a built-in Hono exception (like basicAuth), let it handle itself
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // NOTE : AppError handling
  if (err instanceof AppError) {
    const status = err.options?.status || 400;
    const errors = err.options?.path
      ? [{ message: err.message, path: err.options.path }]
      : [];

    return c.json(
      {
        success: false,
        message: err.message,
        errors: errors,
        timestamp: new Date().toISOString(),
      },
      status as any, // Cast required because Hono strictly types status codes
    );
  }

  // NOTE : Handled Zod - validation errors
  if (err instanceof z.ZodError) {
    const newErrors = err.issues.map((error) => {
      let path = '';
      if (error.path.includes('body')) {
        path = error.path.filter((ex) => ex !== 'body').join('.');
      } else if (error.path.includes('query')) {
        path = error.path.filter((ex) => ex !== 'query').join('.');
      } else if (error.path.includes('params')) {
        path = error.path.filter((ex) => ex !== 'params').join('.');
      } else {
        path = error.path.join('.');
      }

      return {
        path: path,
        message: error.message,
      };
    });

    return c.json(
      {
        success: false,
        message: 'Validation Error',
        errors: newErrors,
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  // NOTE : Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let message = 'Database Error';
    let status = 400;

    // Handle specific Prisma codes (e.g., P2002 = Unique constraint failed)
    if (err.code === 'P2002') {
      message = 'Unique constraint failed';
      status = 409;
    }

    return c.json(
      {
        success: false,
        message,
        errors: [
          {
            path: (err.meta?.target as string[])?.join('.') || 'database',
            message: 'Database operation failed',
          },
        ],
        timestamp: new Date().toISOString(),
      },
      status as any,
    );
  }

  // WARN : Unhandled errors
  logger.error(`Unhandled errors : globalErrorHandler - ${err.message}`);

  return c.json(
    {
      success: false,
      errors: [],
      // In production, you might want to hide err.message for generic 500s
      // to prevent leaking stack traces/internals:
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : err.message,
      timestamp: new Date().toISOString(),
    },
    500,
  );
};
