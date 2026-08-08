import { Hono } from 'hono';
import { getKpiSummaryController } from './kpi.controller';

const kpiRouter = new Hono();

kpiRouter.get('/summary', getKpiSummaryController);
kpiRouter.get('/', getKpiSummaryController);

export default kpiRouter;
