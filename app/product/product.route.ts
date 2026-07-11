import { Hono } from 'hono';
import { validateRequest } from '../../middlewares/validate.middleware';
import * as controller from './product.controller';
import {
  createManySchema,
  createSchema,
  deleteSchema,
  getAllSchema,
  getSchema,
  updateSchema,
  deleteManySchema,
} from './product.schema';

const router = new Hono();

router.post('/', validateRequest(createSchema), controller.createController);
router.post(
  '/many',
  validateRequest(createManySchema),
  controller.createManyController,
);
router.put('/:id', validateRequest(updateSchema), controller.updateController);
router.delete('/:id', validateRequest(deleteSchema), controller.deleteController);
router.post('/delete-many', validateRequest(deleteManySchema), controller.deleteManyController);
router.get('/:id', validateRequest(getSchema), controller.getController);
router.get('/', validateRequest(getAllSchema), controller.getAllController);

export default router;
