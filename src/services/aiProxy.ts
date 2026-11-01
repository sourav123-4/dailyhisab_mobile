import { ACTIVE_ENV } from '../config/active-env';
import { auth } from './firebase';

// Free Cloudflare Worker in ai-proxy/ that holds the Gemini and Groq keys server-side.
const PROXY_URL = ACTIVE_ENV.AI_PROXY_URL.replace(/\/+$/, '');

export type AiResult = { ok: boolean; status: number; data: any };

/** The proxy only serves signed-in, non-anonymous users; offline/guest mode falls back to local logic. */
export function isAiProxyAvailable(): boolean {
  const user = auth?.currentUser;
  return Boolean(PROXY_URL && user && !user.isAnonymous);
}

/** Calls the proxy with the user's Firebase ID token; status 0 means the proxy could not be used. */
async function proxyFetch(path: string, init: RequestInit): Promise<AiResult> {
  if (!isAiProxyAvailable()) return { ok: false, status: 0, data: null };
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch(`${PROXY_URL}${path}`, {
      ...init,
      method: 'POST',
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${idToken}` },
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
  } catch {
    return { ok: false, status: 503, data: null };
  }
}

/**
 * Gemini generateContent. A key the user saved on their own device is used directly;
 * otherwise the request goes through the proxy, which holds the app's key.
 */
export async function geminiGenerateContent(model: string, body: Record<string, unknown>, userKey?: string): Promise<AiResult> {
  const path = `/v1beta/models/${model}:generateContent`;
  const init = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  if (userKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com${path}`, {
      method: 'POST',
      headers: { ...init.headers, 'x-goog-api-key': userKey },
      body: init.body,
    });
    return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
  }
  return proxyFetch(`/gemini${path}`, init);
}

export function groqChatViaProxy(body: Record<string, unknown>): Promise<AiResult> {
  return proxyFetch('/groq/openai/v1/chat/completions', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function groqTranscribeViaProxy(fileUri: string, model: string, prompt: string): Promise<string> {
  // React Native streams { uri, name, type } file parts from disk; no base64 copy in JS.
  const data = new FormData();
  data.append('file', { uri: fileUri, name: 'daily-hisab.m4a', type: 'audio/m4a' } as any);
  data.append('model', model);
  data.append('response_format', 'json');
  data.append('prompt', prompt);
  const result = await proxyFetch('/groq/openai/v1/audio/transcriptions', { body: data });
  if (result.status === 401) throw new Error('Sign in to use voice entry.');
  if (result.status === 429) throw new Error('Too many voice requests. Try again in a minute.');
  if (result.status === 400 && /short|audio file/i.test(JSON.stringify(result.data))) {
    throw new Error('Recording was too short to transcribe.');
  }
  if (!result.ok) throw new Error('Network error uploading audio to voice server.');
  return String(result.data?.text || '').trim();
}

/**
 * Current ExerciseDB demo video URL for one exercise, or null when there is none on the plan, the
 * user is offline or signed out. Never cached: the plan forbids storing it and URLs rotate weekly.
 */
export async function fetchExerciseVideoUrl(lookup: { edbId?: string; name: string; equipment: string }): Promise<string | null> {
  if (!isAiProxyAvailable()) return null;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const query = lookup.edbId
      ? new URLSearchParams({ id: lookup.edbId })
      : new URLSearchParams({ name: lookup.name, equipment: lookup.equipment });
    const res = await fetch(`${PROXY_URL}/exercise-video?${query.toString()}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.videoUrl === 'string' && data.videoUrl.startsWith('https://') ? data.videoUrl : null;
  } catch {
    return null;
  }
}
