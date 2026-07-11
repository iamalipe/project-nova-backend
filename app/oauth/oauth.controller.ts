import { createHash } from 'crypto';
import dayjs from 'dayjs';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';

import { getOAuthAuthorizeHTML } from '../../config/static';
import { db } from '../../services/prisma.service';
import { verifyJWT } from '../../utils/auth.utils';
import { getUUIDv7 } from '../../utils/uuid.utils';
import {
  authorizeQuerySchema,
  consentSchema,
  registerClientSchema,
  tokenSchema,
} from './oauth.schema';

const JWT_SECRET = process.env.JWT_SECRET || '';

const verifyPkce = (codeVerifier: string, codeChallenge: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url') ===
  codeChallenge;

export const getMetadata = async (c: Context) => {
  const BASE_URL = (process.env.BACKEND_URL || c.req.url)
    .replace(/\/$/, '')
    .replace(/\/oauth$/, '');
  return c.json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/oauth/authorize`,
    token_endpoint: `${BASE_URL}/oauth/token`,
    registration_endpoint: `${BASE_URL}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
};

export const registerClient = async (c: Context) => {
  const body = await c.req.json();
  const parsed = registerClientSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid_client_metadata',
        error_description: parsed.error.message,
      },
      400,
    );
  }

  const clientId = getUUIDv7();
  const client = await db.mcpOAuthClient.create({
    data: {
      clientId,
      clientName: parsed.data.client_name || 'MCP Client',
      redirectUris: parsed.data.redirect_uris,
    },
  });

  return c.json(
    {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    },
    201,
  );
};

export const showAuthorizePage = async (c: Context) => {
  const query = c.req.query();
  const parsed = authorizeQuerySchema.safeParse(query);
  if (!parsed.success) {
    return c.text('Invalid authorization request.', 400);
  }
  const {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = parsed.data;

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: client_id },
  });
  if (!client || !client.redirectUris.includes(redirect_uri)) {
    return c.text('Unknown client or redirect_uri.', 400);
  }

  // Check if user is logged in via access token cookie
  const accessToken = getCookie(c, 'access');
  let user = null;
  if (accessToken) {
    const { decoded, expired } = await verifyJWT(accessToken);
    if (!expired && decoded && decoded.id) {
      user = await db.user.findUnique({
        where: { id: decoded.id },
        omit: { password: true },
      });
    }
  }

  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

  const html = getOAuthAuthorizeHTML({
    clientName: client.clientName,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state: state || '',
    frontendUrl,
    user,
  });

  return c.html(html);
};

export const consent = async (c: Context) => {
  const body = await c.req.json();
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: parsed.error.message,
      },
      400,
    );
  }
  const {
    userJwt,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = parsed.data;

  let accessToken = userJwt || getCookie(c, 'access');
  if (!accessToken) {
    return c.json(
      {
        error: 'access_denied',
        error_description: 'Not authenticated.',
      },
      401,
    );
  }

  const { decoded, expired } = await verifyJWT(accessToken);
  if (expired || !decoded || !decoded.id) {
    return c.json(
      {
        error: 'access_denied',
        error_description: 'Invalid session credentials.',
      },
      401,
    );
  }

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: client_id },
  });
  if (!client || !client.redirectUris.includes(redirect_uri)) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Unknown client or redirect_uri.',
      },
      400,
    );
  }

  const code = getUUIDv7();
  await db.mcpOAuthCode.create({
    data: {
      code,
      clientId: client_id,
      userId: decoded.id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      expiresAt: dayjs().add(5, 'minute').toDate(),
    },
  });

  await db.mcpOAuthClient
    .update({
      where: { clientId: client_id },
      data: { userId: decoded.id },
    })
    .catch(() => {});

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);

  return c.json({ redirectTo: redirectUrl.toString() });
};

export const issueToken = async (c: Context) => {
  const body = await c.req.json();
  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: parsed.error.message,
      },
      400,
    );
  }
  const { code, redirect_uri, client_id, code_verifier } = parsed.data;

  const authCode = await db.mcpOAuthCode.findUnique({ where: { code } });
  if (
    !authCode ||
    authCode.clientId !== client_id ||
    authCode.redirectUri !== redirect_uri
  ) {
    return c.json({ error: 'invalid_grant' }, 400);
  }

  if (dayjs(authCode.expiresAt).isBefore(dayjs())) {
    await db.mcpOAuthCode.delete({ where: { id: authCode.id } });
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Authorization code expired.',
      },
      400,
    );
  }

  if (!verifyPkce(code_verifier, authCode.codeChallenge)) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'PKCE verification failed.',
      },
      400,
    );
  }

  await db.mcpOAuthCode.delete({ where: { id: authCode.id } });

  const dbUser = await db.user.findUnique({ where: { id: authCode.userId } });
  if (!dbUser) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'User not found.',
      },
      400,
    );
  }

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: client_id },
  });
  const clientName = client?.clientName || 'Custom App';

  // Create a long-lived UserSession for tracking the connection
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = `${clientName} (MCP Services)`;

  const session = await db.userSession.create({
    data: {
      ip,
      userAgent,
      userId: dbUser.id,
    },
  });

  // Issue signed long-lived token (10 years) containing the session ID
  const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;
  const token = await sign(
    {
      id: dbUser.id,
      sessionId: session.id,
      exp,
    },
    JWT_SECRET,
    'HS256',
  );

  return c.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 10 * 365 * 24 * 60 * 60,
  });
};
