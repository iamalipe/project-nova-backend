import { Hono } from 'hono';
import { requireRole } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import * as controller from './sell.controller';
import {
  createManySchema,
  createSchema,
  deleteManySchema,
  deleteSchema,
  getAllSchema,
  getSchema,
  updateSchema,
} from './sell.schema';

const router = new Hono();

router.post(
  '/',
  requireRole(['SUPERUSER', 'STORE_MANAGER', 'STAFF']),
  validateRequest(createSchema),
  controller.createController,
);
router.post(
  '/many',
  requireRole(['SUPERUSER', 'STORE_MANAGER']),
  validateRequest(createManySchema),
  controller.createManyController,
);
router.put(
  '/:id',
  requireRole(['SUPERUSER', 'STORE_MANAGER']),
  validateRequest(updateSchema),
  controller.updateController,
);
router.delete(
  '/:id',
  requireRole(['SUPERUSER']),
  validateRequest(deleteSchema),
  controller.deleteController,
);
router.post(
  '/delete-many',
  requireRole(['SUPERUSER']),
  validateRequest(deleteManySchema),
  controller.deleteManyController,
);
router.get(
  '/export-csv',
  requireRole(['SUPERUSER', 'STORE_MANAGER']),
  controller.exportCsvController,
);
router.get('/:id', validateRequest(getSchema), controller.getController);
router.get('/', validateRequest(getAllSchema), controller.getAllController);

export default router;
