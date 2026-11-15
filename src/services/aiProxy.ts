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

/**
 * Multipart upload of a local audio file. On SDK 57 the global fetch is expo/fetch, which cannot send
 * React Native's { uri, name, type } file parts, so audio always goes through XMLHttpRequest, which
 * streams the file from disk. Status 0 means the request never got a response (offline, timeout).
 */
function uploadAudio(url: string, authHeader: string, fileUri: string, model: string, prompt: string): Promise<AiResult> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', authHeader);
    xhr.timeout = 30000;
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, data: null });
    xhr.ontimeout = () => resolve({ ok: false, status: 0, data: null });
    const data = new FormData();
    const uri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
    data.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as any);
    data.append('model', model);
    data.append('response_format', 'json');
    if (prompt) data.append('prompt', prompt);
    xhr.send(data);
  });
}

/**
 * Speech to text for a recorded file. Uses the user's own Groq key when given, otherwise the proxy.
 * Retries once when the network drops, since mobile data often blips right after recording.
 */
export async function transcribeAudioFile(fileUri: string, model: string, prompt: string, userKey?: string): Promise<string> {
  const send = async (): Promise<AiResult> => {
    if (userKey) {
      return uploadAudio('https://api.groq.com/openai/v1/audio/transcriptions', `Bearer ${userKey}`, fileUri, model, prompt);
    }
    if (!isAiProxyAvailable()) return { ok: false, status: 401, data: null };
    const idToken = await auth.currentUser.getIdToken();
    return uploadAudio(`${PROXY_URL}/groq/openai/v1/audio/transcriptions`, `Bearer ${idToken}`, fileUri, model, prompt);
  };
  let result = await send();
  if (result.status === 0 || result.status >= 500) {
    await new Promise(r => setTimeout(r, 1200));
    result = await send();
  }
  const body = typeof result.data === 'string' ? result.data : JSON.stringify(result.data || '');
  if (result.status === 400 && /short|audio file/i.test(body)) throw new Error('Recording was too short to transcribe.');
  if (result.status === 401) {
    throw new Error(userKey ? '401 Unauthorized: Invalid Groq API Key' : 'Sign in to use voice entry.');
  }
  if (result.status === 429) throw new Error('Too many voice requests. Try again in a minute.');
  if (result.status === 0) throw new Error('Network error uploading audio to voice server.');
  if (!result.ok) throw new Error(`Voice service error (${result.status}). Please try again.`);
  return String(result.data?.text || '').trim();
}

export async function groqTranscribeViaProxy(fileUri: string, model: string, prompt: string): Promise<string> {
  return transcribeAudioFile(fileUri, model, prompt);
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
