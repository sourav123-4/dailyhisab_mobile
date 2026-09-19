import googleServices from '../../google-services.json';

const androidClient = googleServices.client
  ?.find(client => client.client_info?.android_client_info?.package_name === 'com.dailyhisab.mobile')
  || googleServices.client?.[0];

const androidGoogleClientId = androidClient
  ?.oauth_client
  ?.find(client => client.client_type === 1)
  ?.client_id || '';

const androidApiKey = androidClient?.api_key?.[0]?.current_key || '';
const androidAppId = androidClient?.client_info?.mobilesdk_app_id || '';
const webClientId = androidClient
  ?.oauth_client
  ?.find(client => client.client_type === 3)
  ?.client_id || '';

export const ACTIVE_ENV = {
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '',
  GROQ_STT_MODEL: process.env.EXPO_PUBLIC_GROQ_STT_MODEL || 'whisper-large-v3',
  FIREBASE_API_KEY_IOS: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_IOS || androidApiKey,
  FIREBASE_API_KEY_ANDROID: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID || androidApiKey,
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${googleServices.project_info?.project_id || 'taskmanager-bbf73'}.firebaseapp.com`,
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || googleServices.project_info?.project_id || 'taskmanager-bbf73',
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || googleServices.project_info?.storage_bucket || 'taskmanager-bbf73.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || googleServices.project_info?.project_number || '538636186820',
  FIREBASE_APP_ID_IOS: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || androidAppId,
  FIREBASE_APP_ID_ANDROID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || androidAppId,
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || webClientId,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || webClientId,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || androidGoogleClientId,
  GOOGLE_IOS_REVERSED_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '',
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash',
  ENV_NAME: process.env.NODE_ENV || 'production',
};
