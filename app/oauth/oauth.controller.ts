import { createHash } from 'node:crypto';
import dayjs from 'dayjs';
import type { Context } from 'hono';

import { FRONTEND_URL, OAUTH_TOKEN_EXPIRY } from '../../config/default';
import { db } from '../../services/prisma.service';
import type { AuthUser } from '../../types/general.type';
import { AppError } from '../../utils/appError.utils';
import { generateJWT } from '../../utils/auth.utils';
import { parseDurationToSeconds } from '../../utils/general.utils';
import { getUUIDv7 } from '../../utils/uuid.utils';
import type {
  authorizeSchemaType,
  clientInfoSchemaType,
  consentSchemaType,
  registerClientSchemaType,
  tokenSchemaType,
} from './oauth.schema';

const verifyPkce = (codeVerifier: string, codeChallenge: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url') === codeChallenge;

// http://localhost:3000/oauth/authorize?response_type=code&client_id=pn_123456789&redirect_uri=https%3A%2F%2Fxyz.com%2Foauth%2Fcallback&scope=openid&state=6d8b7c9e4f2a1b3c&code_challenge=N4hB5K8Q3mLzY2rP7xW9aF1vJ6cD0tS8eU4nG2qR5wA&code_challenge_method=S256
export const authorizeController = async (c: Context) => {
  const query = c.get('query') as authorizeSchemaType['query'];

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: query.client_id },
  });

  if (!client || !client.redirectUris.includes(query.redirect_uri)) {
    throw new AppError('Unknown client or redirect_uri.', { status: 400 });
  }

  const redirectUrl = new URL('/oauth/consent', FRONTEND_URL);
  redirectUrl.searchParams.set('response_type', query.response_type);
  redirectUrl.searchParams.set('client_id', query.client_id);
  redirectUrl.searchParams.set('redirect_uri', query.redirect_uri);
  redirectUrl.searchParams.set('code_challenge', query.code_challenge);
  redirectUrl.searchParams.set(
    'code_challenge_method',
    query.code_challenge_method,
  );
  redirectUrl.searchParams.set('state', query.state);
  if (query.scope) redirectUrl.searchParams.set('scope', query.scope);

  return c.redirect(redirectUrl.toString(), 302);
};

export const clientInfoController = async (c: Context) => {
  const query = c.get('query') as clientInfoSchemaType['query'];

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: query.client_id },
    select: { clientId: true, clientName: true },
  });

  if (!client) {
    throw new AppError('Unknown client.', { status: 404 });
  }

  return c.json({
    success: true,
    data: { clientId: client.clientId, clientName: client.clientName },
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

export const registerClient = async (c: Context) => {
  const body = c.get('body') as registerClientSchemaType['body'];

  const clientId = `pn_${getUUIDv7()}`;
  const client = await db.mcpOAuthClient.create({
    data: {
      clientId,
      clientName: body.client_name || 'MCP Client',
      redirectUris: body.redirect_uris,
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

export const consent = async (c: Context) => {
  const body = c.get('body') as consentSchemaType['body'];
  const user = c.get('user') as AuthUser;

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: body.client_id },
  });

  if (!client || !client.redirectUris.includes(body.redirect_uri)) {
    throw new AppError('Unknown client or redirect_uri.', { status: 400 });
  }

  const code = getUUIDv7();
  await db.mcpOAuthCode.create({
    data: {
      code,
      clientId: body.client_id,
      userId: user.id,
      redirectUri: body.redirect_uri,
      codeChallenge: body.code_challenge,
      codeChallengeMethod: body.code_challenge_method,
      expiresAt: dayjs().add(5, 'minute').toDate(),
    },
  });

  const redirectUrl = new URL(body.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', body.state);

  return c.json({
    success: true,
    data: { redirectTo: redirectUrl.toString() },
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};

export const issueToken = async (c: Context) => {
  const body = c.get('body') as tokenSchemaType['body'];

  let authCode;
  try {
    authCode = await db.mcpOAuthCode.delete({ where: { code: body.code } });
  } catch {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Authorization code not found or already used.',
      },
      400,
    );
  }

  if (
    authCode.clientId !== body.client_id ||
    authCode.redirectUri !== body.redirect_uri
  ) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Client or redirect_uri mismatch.',
      },
      400,
    );
  }

  if (dayjs(authCode.expiresAt).isBefore(dayjs())) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'Authorization code expired.',
      },
      400,
    );
  }

  if (!verifyPkce(body.code_verifier, authCode.codeChallenge)) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'PKCE verification failed.',
      },
      400,
    );
  }

  const dbUser = await db.user.findUnique({ where: { id: authCode.userId } });
  if (!dbUser) {
    return c.json(
      { error: 'invalid_grant', error_description: 'User not found.' },
      400,
    );
  }

  const client = await db.mcpOAuthClient.findUnique({
    where: { clientId: body.client_id },
  });
  const clientName = client?.clientName || 'Custom App';

  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = `${clientName} (MCP Services)`;

  const session = await db.userSession.create({
    data: { ip, userAgent, userId: dbUser.id },
  });

  const expirySeconds = parseDurationToSeconds(OAUTH_TOKEN_EXPIRY);
  const token = await generateJWT(
    { id: dbUser.id, sessionId: session.id },
    expirySeconds,
  );

  return c.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: expirySeconds,
  });
};

export const userinfoController = async (c: Context) => {
  const user = c.get('user') as AuthUser;

  return c.json({
    sub: user.id,
    email: user.email,
    given_name: user.firstName,
    family_name: user.lastName,
  });
};
