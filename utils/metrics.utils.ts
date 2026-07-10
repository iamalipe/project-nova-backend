import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import promClient from 'prom-client';

import {
  METRICS_SERVER_PASSWORD,
  METRICS_SERVER_PORT,
  METRICS_SERVER_USERNAME,
} from '../config/default';
import { logger } from './logger';

export const restResponseTimeHistogram = new promClient.Histogram({
  name: 'rest_response_time_duration_seconds',
  help: 'REST API response time in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

export const databaseResponseTimeHistogram = new promClient.Histogram({
  name: 'db_response_time_duration_seconds',
  help: 'Database response time in seconds',
  labelNames: ['operation', 'success'],
});

export function startMetricsServer() {
  const app = new Hono();

  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics();

  app.get(
    '/metrics',
    basicAuth({
      username: METRICS_SERVER_USERNAME,
      password: METRICS_SERVER_PASSWORD,
    }),
    async (c) => {
      // Set the specific content type required by Prometheus
      c.header('Content-Type', promClient.register.contentType);
      const metrics = await promClient.register.metrics();

      // Use c.body() instead of c.text() to preserve the custom Content-Type header
      return c.body(metrics);
    },
  );

  serve(
    {
      fetch: app.fetch,
      port: Number(METRICS_SERVER_PORT), // Ensure port is a number
    },
    (info) => {
      logger.info(`Metrics server started at http://localhost:${info.port}`);
    },
  );
}
