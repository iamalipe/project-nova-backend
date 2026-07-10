import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import 'express-async-errors';

import { healthCheckController, rootController } from './app/app.controller';
import appRouter from './app/app.route';
import { swaggerSpec } from './app/swagger/swagger';
import swaggerUi from 'swagger-ui-express';
import {
  API_DOCS_UI,
  CORS_OPTIONS,
  METRICS_SERVER_ENABLED,
  PORT,
  SWAGGER_PASSWORD,
  SWAGGER_USERNAME,
} from './config/default';
import { basicAuth } from './middlewares/basicAuth.middlewares';
import { globalErrorHandler } from './middlewares/error.middlewares';
import { limiter } from './middlewares/limiter.middlewares';
import { resTime } from './middlewares/resTime.middlewares';
import { cacheConnect, cacheDisconnect } from './services/cache.service';
import { dbConnect, dbDisconnect } from './services/db.services';
import type { PublicUser } from './types/PublicUser.type';
import './utils/appError.utils';
import { logger, requestLogger } from './utils/logger';
import { startMetricsServer } from './utils/metrics.utils';

const app = express();

app.use(requestLogger);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.set('trust proxy', '127.0.0.1');
app.use(cors(CORS_OPTIONS));
app.use(limiter);
app.use(resTime);

app.get('/', rootController);
app.get('/healthcheck', healthCheckController);

// Swagger/Scalar API Documentation protected by Basic Auth
const swaggerAuth = basicAuth({
  username: SWAGGER_USERNAME,
  password: SWAGGER_PASSWORD,
});

app.get('/docs/json', swaggerAuth, (req, res) => {
  res.json(swaggerSpec);
});

if (API_DOCS_UI === 'SWAGGER') {
  app.use('/docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} else {
  app.get('/docs', swaggerAuth, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
  <head>
    <title>API Reference | Express Backend</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/json"
      data-configuration='{"theme": "purple"}'></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
    `);
  });
}

app.use('/api', appRouter);
app.use(globalErrorHandler);

const start = async (): Promise<void> => {
  try {
    app.listen(PORT, async () => {
      logger.info(`App is running on port http://localhost:${PORT}.`);
      await dbConnect();
      await cacheConnect();
      // initScheduler();
      if (METRICS_SERVER_ENABLED === 'true') {
        startMetricsServer();
      }
    });
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

declare global {
  namespace Express {
    interface Request {
      user: PublicUser;
    }
  }
  var AppError: {
    new (
      message: string,
      options?: { path?: string; status?: number },
    ): AppError;
  };
  interface AppError extends Error {
    options?: { path?: string; status?: number };
  }
}
