import { z } from 'zod';

export const authorizeSchema = z.object({
  query: z.object({
    response_type: z.literal('code'),
    client_id: z.string().min(1),
    redirect_uri: z.url(),
    code_challenge: z.string().min(43).max(128),
    code_challenge_method: z.literal('S256'),
    state: z.string().min(1),
    scope: z.literal('openid').optional(),
  }),
});
export type authorizeSchemaType = z.infer<typeof authorizeSchema>;

export const registerClientSchema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.url()).min(1),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
});
export type registerClientSchemaType = z.infer<typeof registerClientSchema>;

export const consentSchema = z.object({
  userJwt: z.string().optional(),
  client_id: z.string().min(1),
  redirect_uri: z.url(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal('S256'),
  state: z.string().optional(),
});
export type consentSchemaType = z.infer<typeof consentSchema>;

export const tokenSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  redirect_uri: z.url(),
  client_id: z.string().min(1),
  code_verifier: z.string().min(1),
});
export type tokenSchemaType = z.infer<typeof tokenSchema>;
