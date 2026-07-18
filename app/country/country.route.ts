import { Hono } from 'hono';
import { validateRequest } from '../../middlewares/validate.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import * as controller from './country.controller';
import {
  createManySchema,
  createSchema,
  deleteSchema,
  getAllSchema,
  getSchema,
  updateSchema,
  deleteManySchema,
} from './country.schema';

const router = new Hono();

router.post(
  '/',
  requireRole(['superuser']),
  validateRequest(createSchema),
  controller.createController,
);
router.post(
  '/many',
  requireRole(['superuser']),
  validateRequest(createManySchema),
  controller.createManyController,
);
router.put(
  '/:id',
  requireRole(['superuser']),
  validateRequest(updateSchema),
  controller.updateController,
);
router.delete(
  '/:id',
  requireRole(['superuser']),
  validateRequest(deleteSchema),
  controller.deleteController,
);
router.post(
  '/delete-many',
  requireRole(['superuser']),
  validateRequest(deleteManySchema),
  controller.deleteManyController,
);
router.get('/:id', validateRequest(getSchema), controller.getController);
router.get('/', validateRequest(getAllSchema), controller.getAllController);

export default router;
