# AI proxy (free Cloudflare Worker)

Keeps the Gemini and Groq keys off the phone. The app sends its normal Gemini/Groq
requests here with the user's Firebase ID token; the worker verifies the token, swaps
in the real key, and relays the answer. Everything runs on free tiers:

| Piece | Free plan used |
| --- | --- |
| This worker | Cloudflare Workers Free (100,000 requests/day) |
| Sign-in + data sync | Firebase Spark (Auth + Firestore free quotas) |
| AI | Gemini API free tier, Groq free tier |

Only signed-in, non-anonymous users of Firebase project `taskmanager-bbf73` are served.
Allowed routes:

- `POST /gemini/v1beta/models/gemini-*:generateContent`: AI Coach, food nutrition
- `POST /groq/openai/v1/chat/completions` (model `openai/gpt-oss-20b`): voice → entries
- `POST /groq/openai/v1/audio/transcriptions`: voice speech-to-text

Requests over 8 MB, other paths, other models and invalid tokens are rejected.

## Deploy (one time)

```bash
cd ai-proxy
npm install
npx wrangler login                     # free Cloudflare account
npx wrangler secret put GEMINI_API_KEY # paste key when prompted
npx wrangler secret put GROQ_API_KEY
npx wrangler deploy                    # prints https://dailyhisab-ai-proxy.<name>.workers.dev
```

Put the printed URL in the app's `.env` as `EXPO_PUBLIC_AI_PROXY_URL`, then restart
Expo with `npx expo start -c` (or rebuild the APK).

Optional: uncomment the `[[ratelimits]]` block in `wrangler.toml` for a per-user
throttle if your plan offers the Rate Limiting binding. The worker uses it when present.

## Test locally (no Cloudflare account needed)

`ai-proxy/.dev.vars` (gitignored) holds the two keys for `wrangler dev`.

```bash
npm test
```

This starts the worker locally, mints test Firebase tokens, and checks routing, token
rejection (forged, expired, wrong project, anonymous), and live Gemini/Groq calls.
