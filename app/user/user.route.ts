import { Hono } from 'hono';
import { validateRequest } from '../../middlewares/validate.middleware';
import * as controller from './user.controller';
import { requireRole } from '../../middlewares/role.middleware';
import {
  deleteSchema,
  getAllSchema,
  getSchema,
  deleteManySchema,
} from './user.schema';

const router = new Hono();

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
