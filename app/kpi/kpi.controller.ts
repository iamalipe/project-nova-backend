import type { Context } from 'hono';
import kpiService from './kpi.service';

export const getKpiSummaryController = async (c: Context) => {
  const data = await kpiService.getKpiSummary();
  return c.json({
    success: true,
    data,
    errors: [],
    timestamp: new Date().toISOString(),
    message: 'success',
  });
};
