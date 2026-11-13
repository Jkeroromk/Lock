/**
 * Screenshot builds only (swapped in for @clerk/clerk-expo by metro.config.js):
 * a signed-in demo user, no network, no sign-in screens.
 */
import type { ReactNode } from 'react';
import { DEMO_USER_ID } from './fixtures';

const noop = async (..._args: any[]): Promise<any> => ({});

const auth = {
  isLoaded: true,
  isSignedIn: true,
  userId: DEMO_USER_ID,
  sessionId: 'screenshot-session',
  orgId: null,
  getToken: async () => 'screenshot',
  signOut: noop,
};

const user = {
  id: DEMO_USER_ID,
  firstName: null,
  lastName: null,
  primaryEmailAddress: { emailAddress: 'demo@kerolock.app' },
  emailAddresses: [{ emailAddress: 'demo@kerolock.app' }],
  externalAccounts: [],
  passwordEnabled: false,
  update: noop,
  reload: noop,
};

export function ClerkProvider({ children }: { children?: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

export const useAuth = () => auth;
export const useUser = () => ({ isLoaded: true, isSignedIn: true, user });
export const useClerk = () => ({ signOut: noop, user });
export const useSignIn = () => ({ isLoaded: true, signIn: { create: noop }, setActive: noop });
export const useSignUp = () => ({ isLoaded: true, signUp: { create: noop }, setActive: noop });
export const useSSO = () => ({ startSSOFlow: noop });
export const useOAuth = () => ({ startOAuthFlow: noop });
export const useSignInWithApple = () => ({ startAppleAuthenticationFlow: noop });
export const isClerkAPIResponseError = () => false;
export const resourceCache = {};
