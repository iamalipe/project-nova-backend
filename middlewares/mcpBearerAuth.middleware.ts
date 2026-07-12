import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { BACKEND_URL } from '../config/default';
import { db } from '../services/prisma.service';
import { verifyJWT } from '../utils/auth.utils';

// Per RFC 9728 §5.1, a 401 on a protected resource should point clients at
// where to discover the authorization server via this header, so an MCP
// client hitting /v1/mcp with no/invalid token can find its way to
// /oauth/register → /oauth/authorize → /oauth/token without hardcoding URLs.
const unauthorized = (c: Context, message: string) => {
  c.header(
    'WWW-Authenticate',
    `Bearer resource_metadata="${BACKEND_URL}/.well-known/oauth-protected-resource"`,
  );
  return c.json({ error: 'Unauthorized', message }, 401);
};

export const mcpBearerAuth = createMiddleware(async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  let token = '';
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = c.req.query('token') || '';
  }

  if (!token) {
    return unauthorized(c, 'Missing token');
  }

  const { decoded, expired } = (await verifyJWT(token)) as any;

  if (expired) {
    return unauthorized(c, 'Token expired');
  }

  if (!decoded || !decoded.id || !decoded.sessionId) {
    return unauthorized(c, 'Invalid token claims');
  }

  const session = await db.userSession.findFirst({
    where: { id: decoded.sessionId, userId: decoded.id },
    include: { user: true },
  });

  if (!session) {
    return unauthorized(c, 'Session has been revoked');
  }

  c.set('user', session.user);
  await next();
});
