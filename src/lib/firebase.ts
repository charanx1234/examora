import { initializeApp } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const popupRedirectResolver = browserPopupRedirectResolver;

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('email');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export const githubAuthProvider = new GithubAuthProvider();
githubAuthProvider.addScope('read:user');
githubAuthProvider.addScope('user:email');
githubAuthProvider.setCustomParameters({
  allow_signup: 'true',
});

/**
 * Checks whether the current browser hostname is authorized in the managed Firebase project
 * so we avoid triggering broken unauthorized-domain popups on external static hosts (e.g. Vercel).
 */
export function isFirebaseAuthorizedHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app') ||
    host.endsWith('.ai.studio')
  );
}
