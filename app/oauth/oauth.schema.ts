import { z } from 'zod';

// code_challenge is BASE64URL(SHA256(code_verifier)) (RFC 7636 §4.2) — the
// RFC 4648 base64url alphabet, no padding.
const codeChallengeCharset = /^[A-Za-z0-9_-]{43,128}$/;
// code_verifier is the client's own high-entropy secret (RFC 7636 §4.1),
// defined over the broader "unreserved" URI character set, which includes
// '.' and '~' in addition to what code_challenge allows.
const codeVerifierCharset = /^[A-Za-z0-9\-._~]{43,128}$/;

export const authorizeSchema = z.object({
  query: z.object({
    response_type: z.literal('code'),
    client_id: z.string().min(1),
    redirect_uri: z.url(),
    code_challenge: z.string().regex(codeChallengeCharset),
    code_challenge_method: z.literal('S256'),
    state: z.string().min(1),
    scope: z.literal('openid').optional(),
  }),
});
export type authorizeSchemaType = z.infer<typeof authorizeSchema>;

export const clientInfoSchema = z.object({
  query: z.object({
    client_id: z.string().min(1),
  }),
});
export type clientInfoSchemaType = z.infer<typeof clientInfoSchema>;

export const registerClientSchema = z.object({
  body: z.object({
    client_name: z.string().optional(),
    redirect_uris: z.array(z.url()).min(1),
    token_endpoint_auth_method: z.string().optional(),
    grant_types: z.array(z.string()).optional(),
    response_types: z.array(z.string()).optional(),
  }),
});
export type registerClientSchemaType = z.infer<typeof registerClientSchema>;

export const consentSchema = z.object({
  body: z.object({
    client_id: z.string().min(1),
    redirect_uri: z.url(),
    code_challenge: z.string().regex(codeChallengeCharset),
    code_challenge_method: z.literal('S256'),
    state: z.string().min(1),
  }),
});
export type consentSchemaType = z.infer<typeof consentSchema>;

export const tokenSchema = z.object({
  body: z.object({
    grant_type: z.literal('authorization_code'),
    code: z.string().min(1),
    redirect_uri: z.url(),
    client_id: z.string().min(1),
    code_verifier: z.string().regex(codeVerifierCharset),
  }),
});
export type tokenSchemaType = z.infer<typeof tokenSchema>;
