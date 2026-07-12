import { Hono } from 'hono';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authorizeController } from './oauth.controller';
import { authorizeSchema } from './oauth.schema';

const router = new Hono();

// router.post('/register', registerClient);
router.get('/authorize', validateRequest(authorizeSchema), authorizeController);
// router.post('/consent', consent);
// router.post('/token', issueToken);

export default router;
