import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  initializeAuth,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ACTIVE_ENV } from '../config/active-env';

const firebaseConfig = {
  apiKey: ACTIVE_ENV.FIREBASE_API_KEY_IOS || ACTIVE_ENV.FIREBASE_API_KEY_ANDROID,
  authDomain: ACTIVE_ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ACTIVE_ENV.FIREBASE_PROJECT_ID,
  storageBucket: ACTIVE_ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ACTIVE_ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: Platform.select({
    ios: ACTIVE_ENV.FIREBASE_APP_ID_IOS,
    android: ACTIVE_ENV.FIREBASE_APP_ID_ANDROID,
    default: ACTIVE_ENV.FIREBASE_APP_ID_ANDROID,
  }),
};

let appInstance: any = null;
try {
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (appErr) {
  console.warn('Firebase app init error:', appErr);
}
export const app = appInstance;

function createReactNativePersistence(storage: typeof AsyncStorage) {
  return class {
    static type = 'LOCAL';
    type = 'LOCAL';
    async _isAvailable() {
      try {
        if (!storage) return false;
        await storage.setItem('__firebase_storage_test__', '1');
        await storage.removeItem('__firebase_storage_test__');
        return true;
      } catch {
        return false;
      }
    }
    _set(key: string, value: any) {
      return storage.setItem(key, JSON.stringify(value));
    }
    async _get(key: string) {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : null;
    }
    _remove(key: string) {
      return storage.removeItem(key);
    }
    _addListener() {}
    _removeListener() {}
  };
}

let authInstance: any = null;
if (app) {
  try {
    const getRNPersistence = (FirebaseAuth as any).getReactNativePersistence;
    const persistenceObj = getRNPersistence ? getRNPersistence(AsyncStorage) : createReactNativePersistence(AsyncStorage);
    authInstance = initializeAuth(app, {
      persistence: persistenceObj,
    });
  } catch (initAuthErr) {
    try {
      authInstance = getAuth(app);
    } catch (getAuthErr) {
      console.warn('Firebase auth init bypassed:', getAuthErr);
    }
  }
}

export const auth = authInstance;

try {
  setLogLevel('silent');
} catch {}

let firestoreInstance: any = null;
if (app) {
  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    try {
      firestoreInstance = getFirestore(app);
    } catch (dbErr) {
      console.warn('Firestore init bypassed:', dbErr);
    }
  }
}

export const db = firestoreInstance;

export function cleanAuthError(err: any): string {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || err || '');

  if (code.includes('invalid-credential') || code.includes('wrong-password') || message.includes('invalid-credential')) {
    return 'Invalid email or password. If you are new here, tap "Create" to register first.';
  }
  if (code.includes('user-not-found') || message.includes('user-not-found')) {
    return 'No account found with this email. Tap "Create" above to sign up.';
  }
  if (code.includes('email-already-in-use') || message.includes('email-already-in-use')) {
    return 'This email is already registered. Please switch to "Sign in".';
  }
  if (code.includes('weak-password') || message.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('invalid-email') || message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('network-request-failed') || message.includes('network-request-failed')) {
    return 'Network connection error. Check your internet or tap "Offline local mode" below.';
  }
  if (code.includes('too-many-requests') || message.includes('too-many-requests')) {
    return 'Access temporarily disabled due to many attempts. Wait 2 minutes or reset password.';
  }
  if (code.includes('operation-not-allowed') || message.includes('operation-not-allowed')) {
    return 'Email/Password sign-in is disabled in Firebase. Use Google or Offline mode.';
  }
  if (code.includes('user-disabled') || message.includes('user-disabled')) {
    return 'This account has been disabled.';
  }

  const cleaned = message
    .replace(/FirebaseError:\s*/gi, '')
    .replace(/Firebase:\s*/gi, '')
    .replace(/\s*\(auth\/.*\)\.?$/gi, '')
    .trim();

  return cleaned.length > 2 && cleaned.toLowerCase() !== 'error'
    ? cleaned
    : 'Authentication failed. Check your email and password or use Offline mode.';
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

async function restAuthDiagnostics(endpoint: 'signInWithPassword' | 'signUp', email: string, password: string) {
  try {
    const apiKey = ACTIVE_ENV.FIREBASE_API_KEY_IOS || ACTIVE_ENV.FIREBASE_API_KEY_ANDROID;
    if (!apiKey) return;
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    });
    const data = await response.json();
    if (data?.error) {
      const errorMsg = String(data.error.message || '');
      if (
        errorMsg.includes('INVALID_LOGIN_CREDENTIALS') ||
        errorMsg.includes('INVALID_PASSWORD') ||
        errorMsg.includes('EMAIL_NOT_FOUND')
      ) {
        const err: any = new Error('Invalid email or password.');
        err.code = 'auth/invalid-credential';
        throw err;
      }
      if (errorMsg.includes('EMAIL_EXISTS')) {
        const err: any = new Error('This email is already registered.');
        err.code = 'auth/email-already-in-use';
        throw err;
      }
      if (errorMsg.includes('WEAK_PASSWORD')) {
        const err: any = new Error('Password must be at least 6 characters.');
        err.code = 'auth/weak-password';
        throw err;
      }
      if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        const err: any = new Error('Too many failed attempts. Try again in a few minutes.');
        err.code = 'auth/too-many-requests';
        throw err;
      }
      const err: any = new Error(errorMsg);
      err.code = `auth/${errorMsg.toLowerCase().replace(/_/g, '-')}`;
      throw err;
    }
  } catch (diagErr) {
    if ((diagErr as any)?.code) {
      throw diagErr;
    }
  }
}

export async function registerWithEmail(email: string, password: string, displayName = '') {
  if (!auth) {
    throw new Error('Authentication is currently offline. Please use Local Mode.');
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    return credential.user;
  } catch (err: any) {
    if (err?.code === 'auth/network-request-failed' || String(err?.message || '').includes('network-request-failed')) {
      await restAuthDiagnostics('signUp', email, password);
    }
    throw err;
  }
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) {
    throw new Error('Authentication is currently offline. Please use Local Mode.');
  }
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  } catch (err: any) {
    if (err?.code === 'auth/network-request-failed' || String(err?.message || '').includes('network-request-failed')) {
      await restAuthDiagnostics('signInWithPassword', email, password);
    }
    throw err;
  }
}

export async function loginWithGoogleIdToken(idToken: string) {
  if (!auth) {
    throw new Error('Authentication is currently offline. Please use Local Mode.');
  }
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export async function updateUserProfile(displayName: string) {
  if (auth?.currentUser) {
    await updateProfile(auth.currentUser, { displayName: displayName.trim() });
    return auth.currentUser;
  }
  return null;
}

export async function changeUserPassword(newPassword: string) {
  if (auth?.currentUser) {
    await FirebaseAuth.updatePassword(auth.currentUser, newPassword);
    return true;
  }
  return false;
}

export async function resetPassword(email: string) {
  if (!auth) {
    throw new Error('Authentication is currently offline.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  if (auth) {
    await signOut(auth);
  }
}
