import { Hono } from 'hono';
import { requireRole } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import * as controller from './store.controller';
import {
  createManySchema,
  createSchema,
  deleteManySchema,
  deleteSchema,
  getAllSchema,
  getSchema,
  updateSchema,
} from './store.schema';

const router = new Hono();

router.post(
  '/',
  requireRole(['SUPERUSER']),
  validateRequest(createSchema),
  controller.createController,
);
router.post(
  '/many',
  requireRole(['SUPERUSER']),
  validateRequest(createManySchema),
  controller.createManyController,
);
router.put(
  '/:id',
  requireRole(['SUPERUSER']),
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
router.get('/:id', validateRequest(getSchema), controller.getController);
router.get('/', validateRequest(getAllSchema), controller.getAllController);

export default router;
