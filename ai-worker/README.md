# Rezumate AI Worker

Cloudflare Worker that sits between the iOS app and OpenAI. It keeps the OpenAI key off the
phone, checks App Store purchases with Apple, and tracks AI usage in D1.

```
iPhone app ──► Worker (/v1/session, /v1/access, /v1/entitlements/sync, /v1/ai/:task) ──► OpenAI
                  │
                  ├── D1: users, pro_grants, subscriptions, usage
                  └── Apple: App Store Server API, DeviceCheck
```

## Endpoints

| Route | Auth | Purpose |
|---|---|---|
| `POST /v1/session` | DeviceCheck token | Exchange the install id for a 30-day session token; first session grants the trial |
| `GET /v1/access` | Bearer | Current AI balance |
| `POST /v1/entitlements/sync` | Bearer | Verify App Store transaction ids with Apple and link them |
| `POST /v1/ai/rewrite-bullet` | Bearer | 3 rewrites of one bullet (1 action) |
| `POST /v1/ai/improve-bullets` | Bearer | One rewrite per weak bullet (1 action) |
| `POST /v1/ai/cover-letter` | Bearer | Cover letter (1 action) |
| `POST /v1/ai/job-insights` | Bearer | Requirements from a job description (free, rate limited) |

Actions are spent in this order: subscription monthly allowance, lifetime Pro grant, free trial.
Nothing is charged when OpenAI fails. Each charged result returns a `retryToken`; if the app
rejects every suggestion as unsafe, it sends the same request again with `retryOf` and is
not charged a second time.

Models: rewrites, Improve Resume and cover letters use `OPENAI_WRITING_MODEL`
(gpt-6.1-sol, low reasoning); job requirements use `OPENAI_EXTRACT_MODEL` (gpt-6-luna, no
reasoning). Token limits include reasoning tokens, so they are set well above the visible
answer. Every task logs its token usage (never resume text).

## Setup

```sh
npm install
npx wrangler login
npx wrangler d1 create rezumate-ai            # paste the database_id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SESSION_SECRET         # openssl rand -hex 32
npx wrangler secret put APPLE_ISSUER_ID
npx wrangler secret put APPLE_IAP_KEY_ID
npx wrangler secret put APPLE_IAP_PRIVATE_KEY < SubscriptionKey_XXXX.p8
npx wrangler secret put APPLE_TEAM_ID
npx wrangler secret put APPLE_DEVICECHECK_KEY_ID
npx wrangler secret put APPLE_DEVICECHECK_PRIVATE_KEY < AuthKey_YYYY.p8
npm run deploy
```

Then set `REZUMATE_AI_BASE_URL` in the Xcode target's build settings to the deployed URL.

Settings in `wrangler.jsonc` → `vars` (model, trial size, Pro grant, monthly cap, daily limit,
DeviceCheck mode) can be changed and redeployed without an app update.

## Local development

```sh
cp .dev.vars.example .dev.vars   # fill in OPENAI_API_KEY and SESSION_SECRET
npm run db:migrate:local
npm run dev
npm test
npm run typecheck
```

Run `npm run types` after changing bindings or vars in `wrangler.jsonc`.

## Evaluating prompts

`npm run eval` runs every task on the sample resumes in `scripts/samples/` against real OpenAI
(through a local `wrangler dev` and the local database) and saves the outputs, token usage
and cost to `eval-output/`. It needs `OPENAI_API_KEY` in `.dev.vars`. Compare models with
`npm run eval -- --writing-model gpt-6-astra --writing-effort medium`.
