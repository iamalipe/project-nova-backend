import { z } from 'zod';
import { zFileS3Schema } from '../../utils/validation.utils';

export const registerSchema = z.object({
  body: z.object({
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    password: z.string().min(8),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(8),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(8),
    newPassword: z.string().min(8),
  }),
});

// For profile image updates (handled by multipart/form-data)
export const profileImageUpdateSchema = z.object({
  body: z.object({
    profileImage: z.union([zFileS3Schema, z.null()]).optional(),
    remove: z
      .string()
      .transform((val) => val === 'true')
      .optional()
      .default('false' as any),
  }),
});

export const profileUpdateSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
});

export type registerSchemaType = z.infer<typeof registerSchema>;
export type loginSchemaType = z.infer<typeof loginSchema>;
export type changePasswordSchemaType = z.infer<typeof changePasswordSchema>;
export type profileImageUpdateSchemaType = z.infer<
  typeof profileImageUpdateSchema
>;
export type profileUpdateSchemaType = z.infer<typeof profileUpdateSchema>;
