import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import 'dotenv/config';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { trimTrailingSlash } from 'hono/trailing-slash';

import { Server as HttpServer } from 'http';
import {
  healthCheckController,
  oauthAuthorizationServerController,
  openidConfigurationController,
  protectedResourceMetadataController,
  rootController,
  tempLogController,
} from './app/app.controller';
import appRouter from './app/app.route';
import router from './app/oauth/oauth.route';
import {
  API_DOCS_UI,
  ENABLE_SOCKET,
  METRICS_SERVER_ENABLED,
  PORT,
  SWAGGER_PASSWORD,
  SWAGGER_USERNAME,
  WHITELISTED_DOMAINS_ARRAY,
} from './config/default';
import { scalarHTML } from './config/static';
import { swaggerSpec } from './config/swagger';
import { globalErrorHandler } from './middlewares/error.middleware';
import { limiter } from './middlewares/limiter.middleware';
import { resTime } from './middlewares/resTime.middleware';
import { cacheConnect, cacheDisconnect } from './services/cache.service';
import { dbConnect, dbDisconnect } from './services/prisma.service';
import { initSocket } from './services/socket.service';
import { AuthUser } from './types/general.type';
import { logger, requestLogger } from './utils/logger';
import { startMetricsServer } from './utils/metrics.utils';

// Define Hono Variables for Type Safety (Replaces Express.Request extension)
type Variables = {
  user: AuthUser;
  uploadedFiles: any;
  body: any;
  query: any;
  params: any;
};

const app = new Hono<{ Variables: Variables }>();

// Built-in and Custom Middlewares
app.use('*', trimTrailingSlash());
app.use('*', requestLogger);
app.use('*', compress());
app.use('*', bodyLimit({ maxSize: 10 * 1024 * 1024 })); // 10mb limit (replaces express.json limit)
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      if (c.req.path.startsWith('/v1/mcp') || c.req.path.startsWith('/oauth')) {
        return origin || '*';
      }
      return WHITELISTED_DOMAINS_ARRAY.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    exposeHeaders: ['mcp-session-id'],
    credentials: true,
  }),
);
app.use('*', limiter);
// app.use('*', timing());
if (METRICS_SERVER_ENABLED) {
  app.use('*', resTime);
}

// Note: cookie-parser is not needed in Hono. Use getCookie(c) in your controllers.
// Note: 'trust proxy' is handled by your deployment environment or via hono/ip.

// Base Routes
app.get('/', rootController);
app.get('/temp-log', tempLogController);
app.get('/healthcheck', healthCheckController);
app.get('/.well-known/openid-configuration', openidConfigurationController);
app.get(
  '/.well-known/oauth-authorization-server',
  oauthAuthorizationServerController,
);
app.get(
  '/.well-known/oauth-protected-resource',
  protectedResourceMetadataController,
);
// RFC 9728 §3.1 also allows the resource's path appended after the
// well-known prefix — some clients probe this form instead of the root one.
app.get(
  '/.well-known/oauth-protected-resource/v1/mcp',
  protectedResourceMetadataController,
);

// Swagger/Scalar API Documentation protected by Basic Auth
const authMiddleware = basicAuth({
  username: SWAGGER_USERNAME,
  password: SWAGGER_PASSWORD,
});

app.get('/docs/json', authMiddleware, (c) => {
  return c.json(swaggerSpec);
});

if (API_DOCS_UI === 'SWAGGER') {
  app.get('/docs', authMiddleware, swaggerUI({ url: '/docs/json' }));
} else {
  app.get('/docs', authMiddleware, (c) => {
    return c.html(scalarHTML);
  });
}

// 5. Mount App Router & Error Handler
app.route('/oauth', router);
app.route('/v1', appRouter);
app.onError(globalErrorHandler);

// Startup Sequence
const start = async (): Promise<void> => {
  try {
    await dbConnect();
    await cacheConnect();
    // initScheduler();

    if (METRICS_SERVER_ENABLED) {
      startMetricsServer();
    }

    const server = serve(
      {
        fetch: app.fetch,
        port: Number(PORT),
      },
      (info) => {
        logger.info(`App is running on http://localhost:${info.port}`);
      },
    );

    if (ENABLE_SOCKET) {
      initSocket(server as unknown as HttpServer);
      logger.info('Socket.io server initialized and running.');
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('An unknown error occurred');
    }
    dbDisconnect();
    cacheDisconnect();
    process.exit(1);
  }
};

start();
