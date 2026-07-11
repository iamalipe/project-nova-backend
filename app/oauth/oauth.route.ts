import { Hono } from 'hono';
import {
  getMetadata,
  registerClient,
  showAuthorizePage,
  consent,
  issueToken,
} from './oauth.controller';

const oauthRouter = new Hono();

oauthRouter.get('/.well-known/oauth-authorization-server', getMetadata);
oauthRouter.post('/register', registerClient);
oauthRouter.get('/authorize', showAuthorizePage);
oauthRouter.post('/consent', consent);
oauthRouter.post('/token', issueToken);

export default oauthRouter;
