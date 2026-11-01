// End-to-end test of the AI proxy in the local Workers runtime (no Cloudflare account needed).
// Mints Firebase-style ID tokens with a throwaway key served as the JWKS, then exercises
// auth rejection, routing and validation, and live Gemini/Groq calls using .dev.vars keys.
//   cd ai-proxy && npm test
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const PROJECT = 'taskmanager-bbf73';
const WORKER_PORT = 8787;
const JWKS_PORT = 8790;
const BASE = `http://127.0.0.1:${WORKER_PORT}`;

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${detail}`}`);
};

const alg = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const trusted = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
const untrusted = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', trusted.publicKey)), kid: 'test-kid', alg: 'RS256', use: 'sig' };

const b64url = buf => Buffer.from(buf).toString('base64url');
async function mint(claims = {}, { key = trusted.privateKey, kid = 'test-kid' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'user-alice', iat: now - 10, exp: now + 3600,
    auth_time: now - 10, firebase: { sign_in_provider: 'password' }, ...claims,
  }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

const jwksServer = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'max-age=60' });
  res.end(JSON.stringify({ keys: [jwk] }));
}).listen(JWKS_PORT, '127.0.0.1');

const worker = spawn('npx', ['wrangler', 'dev', '--port', String(WORKER_PORT), '--var', `JWKS_URL:http://127.0.0.1:${JWKS_PORT}/jwks`], {
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let workerLog = '';
worker.stdout.on('data', d => (workerLog += d));
worker.stderr.on('data', d => (workerLog += d));

async function waitForWorker() {
  for (let i = 0; i < 120; i++) {
    try { await fetch(`${BASE}/`); return; } catch { await new Promise(r => setTimeout(r, 500)); }
  }
  throw new Error(`wrangler dev did not start:\n${workerLog}`);
}

const post = (path, { token, body, headers = {} } = {}) => fetch(`${BASE}${path}`, {
  method: 'POST',
  headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  body,
});
const geminiPath = '/gemini/v1beta/models/gemini-2.5-flash:generateContent';
const geminiBody = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with exactly the word: pong' }] }], generationConfig: { maxOutputTokens: 50 } });

try {
  await waitForWorker();
  const alice = await mint();

  // --- routing & request validation ---
  check('unknown path -> 404', (await post('/v1/anything', { token: alice })).status === 404);
  check('GET on a valid route -> 405', (await fetch(`${BASE}${geminiPath}`)).status === 405);
  check('non-Gemini model path -> 404', (await post('/gemini/v1beta/models/gpt-4:generateContent', { token: alice, body: geminiBody })).status === 404);
  check('path traversal in model -> 404', (await post('/gemini/v1beta/models/gemini-2.5-flash/../../x:generateContent', { token: alice, body: geminiBody })).status === 404);
  check('body over 8 MB -> 413', (await post(geminiPath, { token: alice, body: 'x'.repeat(8 * 1024 * 1024 + 1) })).status === 413);

  // --- authentication ---
  check('no token -> 401', (await post(geminiPath, { body: geminiBody })).status === 401);
  check('garbage token -> 401', (await post(geminiPath, { token: 'not.a.jwt', body: geminiBody })).status === 401);
  check('forged signature (untrusted key) -> 401', (await post(geminiPath, { token: await mint({}, { key: untrusted.privateKey }), body: geminiBody })).status === 401);
  check('unknown key id -> 401', (await post(geminiPath, { token: await mint({}, { kid: 'other-kid' }), body: geminiBody })).status === 401);
  check('expired token -> 401', (await post(geminiPath, { token: await mint({ exp: Math.floor(Date.now() / 1000) - 5 }), body: geminiBody })).status === 401);
  check('token for another Firebase project -> 401', (await post(geminiPath, { token: await mint({ aud: 'other-project' }), body: geminiBody })).status === 401);
  check('wrong issuer -> 401', (await post(geminiPath, { token: await mint({ iss: 'https://evil.example' }), body: geminiBody })).status === 401);
  check('anonymous Firebase user -> 401', (await post(geminiPath, { token: await mint({ firebase: { sign_in_provider: 'anonymous' } }), body: geminiBody })).status === 401);
  check('tampered payload (re-signed claims swapped) -> 401', await (async () => {
    const [h, , s] = alice.split('.');
    const evil = b64url(JSON.stringify({ ...JSON.parse(Buffer.from(alice.split('.')[1], 'base64url')), sub: 'user-mallory' }));
    return (await post(geminiPath, { token: `${h}.${evil}.${s}`, body: geminiBody })).status === 401;
  })());

  // --- exercise demo videos (ExerciseDB V2) ---
  const vid = (query, init = {}) => fetch(`${BASE}/exercise-video?${query}`, init);
  const auth = { headers: { authorization: `Bearer ${alice}` } };
  check('video: no token -> 401', (await vid('id=exr_41n2hxnFMotsXTj3')).status === 401);
  check('video: POST -> 405', (await vid('id=exr_41n2hxnFMotsXTj3', { method: 'POST', ...auth })).status === 405);
  check('video: malformed id -> 400', (await vid('id=../../x', auth)).status === 400);
  check('video: name without equipment -> 400', (await vid('name=curl', auth)).status === 400);
  {
    const res = await vid('id=exr_41n2hxnFMotsXTj3', auth);
    const body = await res.json().catch(() => null);
    // 503 without a key in .dev.vars; with one, a current CDN mp4 URL that is never cached.
    check(`video: by id -> ${res.status} ${body?.name || ''}`, res.status === 503 || (res.status === 200 && /^https:\/\/cdn\.exercisedb\.dev\/.+\.mp4$/.test(body?.videoUrl) && res.headers.get('cache-control') === 'no-store'), `${res.status} ${JSON.stringify(body).slice(0, 160)}`);
    check('video: response does not leak the RapidAPI key', !JSON.stringify(body).includes('rapidapi') && !res.headers.get('x-rapidapi-key'));
  }
  {
    const res = await vid('name=Lateral%20Raise&equipment=DUMBBELL', auth);
    const body = await res.json().catch(() => null);
    check(`video: by name + equipment -> ${res.status} ${body?.name || ''}`, res.status === 503 || (res.status === 200 && body.videoUrl.endsWith('.mp4')), `${res.status}`);
  }
  {
    // Romanian deadlift exists only as a dumbbell version on the free plan: a barbell lookup must not return it.
    const res = await vid('name=Romanian%20Deadlift&equipment=BARBELL', auth);
    check(`video: wrong equipment is refused -> ${res.status}`, res.status === 503 || res.status === 404, `${res.status}`);
  }

  // --- live upstream calls through the proxy (keys from .dev.vars) ---
  let res = await post(geminiPath, { token: alice, body: geminiBody, headers: { 'content-type': 'application/json' } });
  let data = await res.json().catch(() => null);
  const pong = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  check(`Gemini answers via server key ("${String(pong).trim().slice(0, 20)}")`, res.status === 200 && typeof pong === 'string' && pong.length > 0, `${res.status} ${JSON.stringify(data).slice(0, 160)}`);

  res = await post('/gemini/v1beta/models/gemini-2.5-flash-does-not-exist:generateContent', { token: alice, body: geminiBody, headers: { 'content-type': 'application/json' } });
  check('upstream 404 passed through (app falls back to next model)', res.status === 404, String(res.status));

  check('Groq chat: unlisted model -> 400', (await post('/groq/openai/v1/chat/completions', { token: alice, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'some-expensive-model', messages: [] }) })).status === 400);
  check('Groq chat: non-JSON body -> 400', (await post('/groq/openai/v1/chat/completions', { token: alice, body: 'nope' })).status === 400);
  res = await post('/groq/openai/v1/chat/completions', {
    token: alice,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-oss-20b', reasoning_effort: 'low', messages: [{ role: 'user', content: 'Voice text: "350 petrol aur 500 groceries". Return JSON {"transactions":[{"title":string,"amount":number}]}' }], temperature: 0.1, max_tokens: 450, response_format: { type: 'json_object' } }),
  });
  data = await res.json().catch(() => null);
  let txs = null;
  try { txs = JSON.parse(data.choices[0].message.content).transactions; } catch {}
  check(`Groq chat parses voice text (${(txs || []).map(t => `${t.title}:${t.amount}`).join(', ')})`, res.status === 200 && Array.isArray(txs) && txs.some(t => Number(t.amount) === 350) && txs.some(t => Number(t.amount) === 500), `${res.status} ${JSON.stringify(data).slice(0, 160)}`);

  check('Groq STT: non-multipart body -> 400', (await post('/groq/openai/v1/audio/transcriptions', { token: alice, headers: { 'content-type': 'application/json' }, body: '{}' })).status === 400);
  const voice = new URL('./voice.m4a', import.meta.url);
  if (!existsSync(voice) && process.platform === 'darwin') {
    execFileSync('say', ['-o', voice.pathname, '--data-format=aac', 'Five hundred rupees petrol and two hundred for groceries']);
  }
  if (existsSync(voice)) {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(voice)], { type: 'audio/m4a' }), 'daily-hisab.m4a');
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'json');
    form.append('prompt', 'rupees, petrol, groceries');
    res = await post('/groq/openai/v1/audio/transcriptions', { token: alice, body: form });
    data = await res.json().catch(() => null);
    const said = String(data?.text || '');
    check(`Groq speech-to-text streams multipart audio ("${said.slice(0, 60)}")`, res.status === 200 && /petrol/i.test(said) && /(500|five hundred)/i.test(said), `${res.status} ${JSON.stringify(data).slice(0, 160)}`);
  } else {
    console.log('SKIP  speech-to-text (add test/voice.m4a to run it)');
  }

  const leaked = /AQ\.Ab8|gsk_|AIza|x-rapidapi-key/i.test(workerLog);
  check('worker log contains no API keys', !leaked);
} catch (error) {
  fail++;
  console.log(`FAIL  test run crashed -> ${error.message}`);
} finally {
  worker.kill('SIGTERM');
  jwksServer.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  setTimeout(() => process.exit(fail ? 1 : 0), 300);
}
