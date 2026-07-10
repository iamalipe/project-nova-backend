import { createMiddleware } from 'hono/factory';
import { restResponseTimeHistogram } from '../utils/metrics.utils';

export const resTime = createMiddleware(async (c, next) => {
  // Use performance.now() for high-resolution timing (better than Date.now())
  const start = performance.now();

  // Wait for the route handler and other middlewares to finish
  await next();

  const time = performance.now() - start;

  // c.req.routePath gives the matched route pattern (e.g., "/users/:id")
  // rather than the raw URL (e.g., "/users/123"), preventing Prometheus cardinality explosion.
  const routePath = c.req.routePath;

  if (routePath) {
    restResponseTimeHistogram.observe(
      {
        method: c.req.method,
        route: routePath,
        status_code: c.res.status,
      },
      time / 1000, // Prometheus expects seconds, not milliseconds
    );
  }
});
