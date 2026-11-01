/**
 * Free-tier AI proxy (Cloudflare Workers). Holds the Gemini and Groq keys so they never
 * ship in the app, and only forwards requests from signed-in (non-anonymous) Firebase users.
 *
 * Bodies are streamed through rather than parsed wherever possible: the Workers Free plan
 * allows 10 ms of CPU per request, and photos/audio can be several MB.
 */

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  /** RapidAPI key subscribed to ExerciseDB V2 ("EDB with Videos and Images by AscendAPI"). */
  EXERCISEDB_API_KEY?: string;
  FIREBASE_PROJECT_ID: string;
  /** Overridable only so local tests can serve their own signing keys. */
  JWKS_URL?: string;
  AI_RATE_LIMITER?: RateLimiter;
}

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_CHAT_BODY_BYTES = 64 * 1024;
const GEMINI_ROUTE = /^\/gemini\/v1beta\/models\/(gemini-[a-z0-9.-]{1,40}):generateContent$/;
const GROQ_CHAT_ROUTE = '/groq/openai/v1/chat/completions';
const GROQ_STT_ROUTE = '/groq/openai/v1/audio/transcriptions';
const GROQ_CHAT_MODELS = new Set(['openai/gpt-oss-20b']);
const GROQ_REASONING_EFFORTS = new Set(['low', 'medium', 'high']);
const VIDEO_ROUTE = '/exercise-video';
const EDB_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
const EDB_ID = /^exr_[A-Za-z0-9]{8,32}$/;
const EDB_EQUIPMENT = /^[A-Z ]{2,30}$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fail = (status: number, message: string) => json(status, { error: { message } });

// ---- Firebase ID token verification (RS256 against Google's published signing keys) ----

let keyCache: { url: string; keys: Map<string, CryptoKey>; expiresAt: number } | null = null;

async function loadSigningKeys(url: string, force = false): Promise<Map<string, CryptoKey>> {
  if (!force && keyCache && keyCache.url === url && keyCache.expiresAt > Date.now()) return keyCache.keys;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
  const { keys: jwks } = (await res.json()) as { keys: Array<JsonWebKey & { kid: string }> };
  const keys = new Map<string, CryptoKey>();
  for (const jwk of jwks) {
    keys.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  keyCache = { url, keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

function base64UrlBytes(segment: string): Uint8Array<ArrayBuffer> {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

const decodeSegment = (segment: string) => JSON.parse(new TextDecoder().decode(base64UrlBytes(segment)));

/** Returns the uid of a valid, non-anonymous user's token, or null. */
export async function verifyFirebaseIdToken(token: string, env: Env): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header: { alg?: string; kid?: string };
  let payload: Record<string, any>;
  try {
    header = decodeSegment(parts[0]);
    payload = decodeSegment(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256' || !header.kid) return null;

  const projectId = env.FIREBASE_PROJECT_ID;
  const now = Math.floor(Date.now() / 1000);
  const skew = 300;
  if (
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128 ||
    !(payload.exp > now) ||
    !(payload.iat <= now + skew) ||
    (payload.auth_time !== undefined && !(payload.auth_time <= now + skew)) ||
    payload.firebase?.sign_in_provider === 'anonymous'
  ) {
    return null;
  }

  const url = env.JWKS_URL || GOOGLE_JWKS_URL;
  let key = (await loadSigningKeys(url)).get(header.kid);
  if (!key) key = (await loadSigningKeys(url, true)).get(header.kid); // Google rotates keys
  if (!key) return null;

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlBytes(parts[2]), signed);
  return valid ? payload.sub : null;
}

// ---- Upstream forwarding ----

/** Relays the upstream status and JSON body; provider headers are not passed back. */
async function relay(upstream: Response): Promise<Response> {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
}

async function forwardGeminiGenerate(model: string, request: Request, env: Env) {
  return relay(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
    body: request.body,
  }));
}

async function forwardGroqChat(request: Request, env: Env) {
  if (Number(request.headers.get('content-length') || 0) > MAX_CHAT_BODY_BYTES) return fail(413, 'Request is too large.');
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'Body must be JSON.');
  }
  if (!GROQ_CHAT_MODELS.has(String(body.model)) || !Array.isArray(body.messages)) {
    return fail(400, 'A supported model and messages are required.');
  }
  return relay(await fetch(`https://api.groq.com${GROQ_CHAT_ROUTE.slice('/groq'.length)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: Math.min(Number(body.max_tokens) || 450, 1024),
      response_format: body.response_format,
      // gpt-oss spends max_tokens on reasoning first; 'low' keeps short JSON answers from truncating
      reasoning_effort: GROQ_REASONING_EFFORTS.has(String(body.reasoning_effort)) ? body.reasoning_effort : 'low',
    }),
  }));
}

async function forwardGroqTranscribe(request: Request, env: Env) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data')) return fail(400, 'Audio must be sent as multipart/form-data.');
  return relay(await fetch(`https://api.groq.com${GROQ_STT_ROUTE.slice('/groq'.length)}`, {
    method: 'POST',
    headers: { 'content-type': contentType, authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: request.body,
  }));
}

// ---- ExerciseDB V2 demo videos ----
// The plan does not include caching rights and media URLs rotate weekly, so nothing here is
// cached: every lookup asks ExerciseDB for the current video URL and the app streams it from
// ExerciseDB's CDN directly.

type EdbExercise = { exerciseId: string; name: string; equipments?: string[]; videoUrl?: string; imageUrl?: string };

async function edb(path: string, env: Env): Promise<any | null> {
  const res = await fetch(`https://${EDB_HOST}${path}`, {
    headers: { 'x-rapidapi-key': env.EXERCISEDB_API_KEY!, 'x-rapidapi-host': EDB_HOST },
  });
  if (res.status === 429) throw new Error('rate-limited');
  if (!res.ok) return null;
  return res.json();
}

const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

/** The listed exercise whose name contains every word of the query, preferring the shortest name. */
export function pickByName(query: string, candidates: EdbExercise[]): EdbExercise | null {
  const wanted = words(query);
  const matches = candidates.filter(c => {
    const have = new Set(words(c.name));
    return wanted.every(w => have.has(w));
  });
  return matches.sort((a, b) => a.name.length - b.name.length)[0] || null;
}

async function serveExerciseVideo(url: URL, env: Env): Promise<Response> {
  if (!env.EXERCISEDB_API_KEY) return fail(503, 'Exercise videos are not configured.');
  const id = url.searchParams.get('id') || '';
  const name = (url.searchParams.get('name') || '').slice(0, 60);
  const equipment = (url.searchParams.get('equipment') || '').toUpperCase();
  if (id && !EDB_ID.test(id)) return fail(400, 'Bad exercise id.');
  if (!id && (!name || !EDB_EQUIPMENT.test(equipment))) return fail(400, 'An exercise id, or a name and equipment, is required.');

  try {
    let exerciseId = id;
    if (!exerciseId) {
      const list = await edb(`/api/v1/exercises?${new URLSearchParams({ name, equipments: equipment, limit: '25' })}`, env);
      const pick = pickByName(name, (list?.data || []) as EdbExercise[]);
      if (!pick) return fail(404, 'No demo video for this exercise on the current plan.');
      exerciseId = pick.exerciseId;
    }
    const detail = await edb(`/api/v1/exercises/${exerciseId}`, env);
    const exercise = detail?.data as EdbExercise | undefined;
    if (!exercise?.videoUrl) return fail(404, 'No demo video for this exercise on the current plan.');
    // A name lookup must not hand back a different piece of equipment (e.g. dumbbell vs barbell).
    if (!id && !(exercise.equipments || []).includes(equipment)) return fail(404, 'No matching demo video.');
    return new Response(JSON.stringify({ videoUrl: exercise.videoUrl, imageUrl: exercise.imageUrl, name: exercise.name }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return fail(429, 'Demo videos are busy right now. Try again in a minute.');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === VIDEO_ROUTE) {
      if (request.method !== 'GET') return fail(405, 'Use GET.');
      const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '')?.[1];
      const uid = token ? await verifyFirebaseIdToken(token, env).catch(() => null) : null;
      if (!uid) return fail(401, 'Sign in to see exercise videos.');
      return serveExerciseVideo(url, env);
    }
    const geminiMatch = GEMINI_ROUTE.exec(pathname);
    const route = geminiMatch ? 'gemini' : pathname === GROQ_CHAT_ROUTE ? 'groqChat' : pathname === GROQ_STT_ROUTE ? 'groqStt' : null;
    if (!route) return fail(404, 'Not found.');
    if (request.method !== 'POST') return fail(405, 'Use POST.');
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return fail(413, 'Request is too large.');

    const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '')?.[1];
    const uid = token ? await verifyFirebaseIdToken(token, env).catch(() => null) : null;
    if (!uid) return fail(401, 'Sign in to use AI features.');

    if (env.AI_RATE_LIMITER && !(await env.AI_RATE_LIMITER.limit({ key: uid })).success) {
      return fail(429, 'Too many AI requests. Try again in a minute.');
    }

    if (route === 'gemini') {
      if (!env.GEMINI_API_KEY) return fail(503, 'AI proxy is not configured.');
      return forwardGeminiGenerate(geminiMatch![1], request, env);
    }
    if (!env.GROQ_API_KEY) return fail(503, 'AI proxy is not configured.');
    return route === 'groqChat' ? forwardGroqChat(request, env) : forwardGroqTranscribe(request, env);
  },
};
