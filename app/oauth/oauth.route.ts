import { Hono } from 'hono';
import { jwtAuth } from '../../middlewares/jwtAuth.middleware';
import { mcpBearerAuth } from '../../middlewares/mcpBearerAuth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  authorizeController,
  clientInfoController,
  consent,
  issueToken,
  registerClient,
  userinfoController,
} from './oauth.controller';
import {
  authorizeSchema,
  clientInfoSchema,
  consentSchema,
  registerClientSchema,
  tokenSchema,
} from './oauth.schema';

const router = new Hono();

router.get('/authorize', validateRequest(authorizeSchema), authorizeController);
router.get(
  '/client-info',
  validateRequest(clientInfoSchema),
  clientInfoController,
);
router.post(
  '/register',
  validateRequest(registerClientSchema),
  registerClient,
);
router.post('/consent', jwtAuth, validateRequest(consentSchema), consent);
router.post('/token', validateRequest(tokenSchema), issueToken);
router.get('/userinfo', mcpBearerAuth, userinfoController);

export default router;
