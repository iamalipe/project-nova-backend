import { Hono } from 'hono';

import authRouter from './auth/auth.route';

import {
  longPollDemoController,
  readableStreamDemoController,
  sseDemoController,
} from './app.controller';

const appRouter = new Hono();

// Mount unprotected sub-routers
appRouter.route('/auth', authRouter);
// appRouter.route('/change-log', changeLogRouter);

// Apply JWT middleware to protected routes, then mount the routers
// Note the '/*' wildcard — this tells Hono to apply the middleware to all nested routes
// appRouter.use('/copy-me/*', jwtAuth);
// appRouter.route('/copy-me', copyMeRouter);

// appRouter.use('/product/*', jwtAuth);
// appRouter.route('/product', productRouter);

// appRouter.use('/chat/*', jwtAuth);
// appRouter.route('/chat', chatRouter);

// Standard controllers
appRouter.get('/sse-demo', sseDemoController);
appRouter.get('/readable-stream-demo', readableStreamDemoController);
appRouter.get('/long-poll-demo', longPollDemoController);

// Environment specific routes
// if (process.env.NODE_ENV === 'development') {
//   appRouter.route('/testing', testingRouter);
// }

export default appRouter;
