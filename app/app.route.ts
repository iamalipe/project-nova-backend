import { Hono } from 'hono';

// import { jwtAuth } from '../middlewares/jwtAuth.middlewares';
// import authRouter from './auth/auth.route';
// import blogRouter from './blog/blog.route';
// import changeLogRouter from './changeLog/changeLog.route';
// import copyMeRouter from './copyMe/copyMe.route';
// import ipLookupRouter from './ipLookup/ipLookup.route';
// import productRouter from './product/product.route';
// import testingRouter from './testing/testing';
// import chatRouter from './chat/chat.route';

import {
  longPollDemoController,
  readableStreamDemoController,
  sseDemoController,
} from './app.controller';

const appRouter = new Hono();

// Mount unprotected sub-routers
// appRouter.route('/auth', authRouter);
// appRouter.route('/change-log', changeLogRouter);
// appRouter.route('/blog', blogRouter);
// appRouter.route('/ip', ipLookupRouter);

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
