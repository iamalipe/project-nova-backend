import { Hono } from 'hono';
import { requireRole } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import * as controller from './user.controller';
import {
  deleteManySchema,
  deleteSchema,
  getAllSchema,
  getSchema,
} from './user.schema';

const router = new Hono();

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
