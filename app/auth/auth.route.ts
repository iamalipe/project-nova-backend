import { Hono } from 'hono';
import { validateFiles } from '../../middlewares/file.middleware';
import { jwtAuth } from '../../middlewares/jwtAuth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import * as controller from './auth.controller';
import {
  loginSchema,
  profileImageUpdateSchema,
  registerSchema,
} from './auth.schema';

const router = new Hono();

router.post('/login', validateRequest(loginSchema), controller.loginController);
router.post(
  '/register',
  validateRequest(registerSchema),
  controller.registerController,
);
router.get('/me', jwtAuth, controller.getCurrentUser);
router.get('/logout', jwtAuth, controller.userLogout);
router.put(
  '/profile-image',
  jwtAuth,
  validateFiles({
    validateFiles: [
      {
        fieldName: 'profileImage',
        isArray: false,
        fileSize: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        s3Upload: true,
        s3Folder: 'profile-image',
        s3Type: 'public',
      },
    ],
  }),
  validateRequest(profileImageUpdateSchema),
  controller.profileImageUpdate,
);

export default router;
