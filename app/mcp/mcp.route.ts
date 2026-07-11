import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { handleMcpPost, methodNotAllowed } from './mcp.controller';
import { verifyJWT } from '../../utils/auth.utils';
import { db } from '../../services/prisma.service';
import { jwtAuth } from '../../middlewares/jwtAuth.middleware';

import { AuthUser } from '../../types/general.type';

type Variables = {
  user: AuthUser;
  uploadedFiles?: any;
  body?: any;
  query?: any;
  params?: any;
};

const mcpBearerAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid token format' }, 401);
  }

  const token = authHeader.substring(7);
  const { decoded, expired } = (await verifyJWT(token)) as any;

  if (expired) {
    return c.json({ error: 'Unauthorized', message: 'Token expired' }, 401);
  }

  if (!decoded || !decoded.id || !decoded.sessionId) {
    return c.json({ error: 'Unauthorized', message: 'Invalid token claims' }, 401);
  }

  const session = await db.userSession.findFirst({
    where: { id: decoded.sessionId, userId: decoded.id },
    include: { user: true },
  });

  if (!session) {
    return c.json({ error: 'Unauthorized', message: 'Session has been revoked' }, 401);
  }

  c.set('user', session.user);
  await next();
});

const mcpRouter = new Hono<{ Variables: Variables }>();
mcpRouter.post('/', mcpBearerAuth, handleMcpPost);
mcpRouter.all('/', methodNotAllowed);

const mcpConnectionRouter = new Hono<{ Variables: Variables }>();
mcpConnectionRouter.use('/*', jwtAuth);

mcpConnectionRouter.get('/status', async (c) => {
  const user = c.get('user');
  const connections = await db.userSession.findMany({
    where: {
      userId: user.id,
      userAgent: { contains: '(MCP Services)' },
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({
    success: true,
    data: connections.map((conn) => ({
      id: conn.id,
      clientName: conn.userAgent?.replace(' (MCP Services)', '') || 'Custom Client',
      ip: conn.ip,
      createdAt: conn.createdAt,
    })),
  });
});

mcpConnectionRouter.post('/disconnect/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const session = await db.userSession.findFirst({
    where: { id, userId: user.id },
  });

  if (!session) {
    return c.json({ success: false, message: 'Connection not found' }, 404);
  }

  await db.userSession.delete({ where: { id } });

  return c.json({ success: true, message: 'Connection revoked successfully' });
});

export { mcpRouter, mcpConnectionRouter };
export default mcpRouter;
