import NextAuth from 'next-auth';
import { cache } from 'react';

import { authConfig } from './config';

const {
  auth: uncachedAuth,
  handlers: authHandlers,
  signIn,
  signOut,
} = NextAuth(authConfig);

const auth = cache(uncachedAuth);

const handlers = {
  POST: authHandlers.POST,
  GET: authHandlers.GET,
};

export { auth, handlers, signIn, signOut };
