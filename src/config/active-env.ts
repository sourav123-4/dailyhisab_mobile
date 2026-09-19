import googleServices from '../../google-services.json';

const androidGoogleClientId = googleServices.client
  ?.find(client => client.client_info?.android_client_info?.package_name === 'com.dailyhisab.mobile')
  ?.oauth_client
  ?.find(client => client.client_type === 1)
  ?.client_id || '';

export const ACTIVE_ENV = {
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '',
  GROQ_STT_MODEL: process.env.EXPO_PUBLIC_GROQ_STT_MODEL || 'whisper-large-v3',
  FIREBASE_API_KEY_IOS: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_IOS || '',
  FIREBASE_API_KEY_ANDROID: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID || '',
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'taskmanager-bbf73.firebaseapp.com',
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'taskmanager-bbf73',
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'taskmanager-bbf73.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '538636186820',
  FIREBASE_APP_ID_IOS: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || '',
  FIREBASE_APP_ID_ANDROID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || '',
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || androidGoogleClientId,
  GOOGLE_IOS_REVERSED_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '',
  ENV_NAME: process.env.NODE_ENV || 'production',
};
