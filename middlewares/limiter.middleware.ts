import { getConnInfo } from '@hono/node-server/conninfo';
import { rateLimiter } from 'hono-rate-limiter';

// If you want to use Redis, you still use the standard rate-limit-redis package
// import RedisStore from 'rate-limit-redis';
// import { redisClient } from '../services/cache.service';

export const limiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 300, // each IP can make up to 300 requests per `windowMs`
  standardHeaders: 'draft-6', // adds the `RateLimit-*` headers to the response
  message: 'Too many requests, please try again later',

  // Hono requires you to tell it how to identify the user (usually by IP)
  keyGenerator: (c) => {
    // OPTION 1: If you are behind a proxy/load balancer (Nginx, Cloudflare, AWS)
    const forwardedFor = c.req.header('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // OPTION 2: If running directly on a Node.js server
    const info = getConnInfo(c);
    return info.remote.address || 'anonymous';
  },

  // NOTE: and be use redis
  // store: new RedisStore({
  //   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  // }),
});
