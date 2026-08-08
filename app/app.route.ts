import { Hono } from 'hono';

import { jwtAuth } from '../middlewares/jwtAuth.middleware';
import authRouter from './auth/auth.route';
import categoryRouter from './category/category.route';
import countryRouter from './country/country.route';
import { mcpConnectionRouter, mcpRouter } from './mcp/mcp.route';
import productRouter from './product/product.route';
import sellRouter from './sell/sell.route';
import stateRouter from './state/state.route';
import stockRouter from './stock/stock.route';
import storeRouter from './store/store.route';
import subcategoryRouter from './subcategory/subcategory.route';
import testRouter from './test/test.route';
import userRouter from './user/user.route';
import kpiRouter from './kpi/kpi.route';

import { NODE_ENV } from '../config/default';
import {
  getImageController,
  longPollDemoController,
  readableStreamDemoController,
  sseDemoController,
} from './app.controller';

const appRouter = new Hono();

// Mount unprotected sub-routers
appRouter.route('/auth', authRouter);

// Apply JWT middleware to protected routes, then mount the routers
// Note the '/*' wildcard — this tells Hono to apply the middleware to all nested routes
appRouter.use('/category/*', jwtAuth);
appRouter.route('/category', categoryRouter);

appRouter.use('/subcategory/*', jwtAuth);
appRouter.route('/subcategory', subcategoryRouter);

appRouter.use('/product/*', jwtAuth);
appRouter.route('/product', productRouter);

appRouter.use('/user/*', jwtAuth);
appRouter.route('/user', userRouter);

appRouter.use('/country/*', jwtAuth);
appRouter.route('/country', countryRouter);

appRouter.use('/state/*', jwtAuth);
appRouter.route('/state', stateRouter);

appRouter.use('/store/*', jwtAuth);
appRouter.route('/store', storeRouter);

appRouter.use('/stock/*', jwtAuth);
appRouter.route('/stock', stockRouter);

appRouter.use('/sell/*', jwtAuth);
appRouter.route('/sell', sellRouter);

appRouter.use('/kpi/*', jwtAuth);
appRouter.route('/kpi', kpiRouter);

appRouter.route('/mcp', mcpRouter);
appRouter.route('/mcp/connections', mcpConnectionRouter);

// Environment specific routes
if (NODE_ENV === 'development') {
  appRouter.route('/test', testRouter);
}

// Standard controllers
appRouter.get('/sse-demo', sseDemoController);
appRouter.get('/readable-stream-demo', readableStreamDemoController);
appRouter.get('/long-poll-demo', longPollDemoController);
appRouter.get('/get-image/*', getImageController);

export default appRouter;
