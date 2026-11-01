import { NativeModules, TurboModuleRegistry } from 'react-native';

export const isGoogleSigninNativeAvailable = (): boolean => {
  try {
    if (typeof TurboModuleRegistry?.get === 'function') {
      const turbo = TurboModuleRegistry.get('RNGoogleSignin');
      if (turbo != null) return true;
    }
    if (NativeModules && NativeModules.RNGoogleSignin != null) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

let cachedModule: any = null;

function getNativeModule(): any {
  if (cachedModule) return cachedModule;
  if (!isGoogleSigninNativeAvailable()) return null;
  try {
    // Only require the native library if the native binary module actually exists
    cachedModule = require('@react-native-google-signin/google-signin');
    return cachedModule;
  } catch (err) {
    console.warn('[GoogleAuth] Native module could not be required:', err);
    return null;
  }
}

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};

export function isCancelledResponse(response: any): boolean {
  const mod = getNativeModule();
  if (mod?.isCancelledResponse) {
    return mod.isCancelledResponse(response);
  }
  return response?.type === 'cancelled';
}

export function isSuccessResponse(response: any): response is { data: { idToken: string | null; user?: any } } {
  const mod = getNativeModule();
  if (mod?.isSuccessResponse) {
    return mod.isSuccessResponse(response);
  }
  return response?.type === 'success';
}

export function isErrorWithCode(error: unknown): error is { code: string } {
  const mod = getNativeModule();
  if (mod?.isErrorWithCode) {
    return mod.isErrorWithCode(error);
  }
  return (
    (error instanceof Error || (typeof error === 'object' && error !== null)) &&
    'code' in (error as any)
  );
}

export const GoogleSignin = {
  configure: (config: any) => {
    const mod = getNativeModule();
    if (mod?.GoogleSignin?.configure) {
      mod.GoogleSignin.configure(config);
    }
  },
  hasPlayServices: async (options?: any) => {
    const mod = getNativeModule();
    if (mod?.GoogleSignin?.hasPlayServices) {
      return await mod.GoogleSignin.hasPlayServices(options);
    }
    return false;
  },
  signIn: async () => {
    const mod = getNativeModule();
    if (mod?.GoogleSignin?.signIn) {
      return await mod.GoogleSignin.signIn();
    }
    throw new Error(
      'Google Sign-In is not supported in Expo Go because it requires custom native binaries. To use Google Sign-In, please launch a development build (npx expo run:android) or sign in with Email & Password.'
    );
  },
  signOut: async () => {
    const mod = getNativeModule();
    if (mod?.GoogleSignin?.signOut) {
      return await mod.GoogleSignin.signOut();
    }
    return null;
  },
};
