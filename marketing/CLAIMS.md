# Claims

Only **Verified** claims may appear on screen. See the remotion-ads `references/claims.md`.

## Verified

- Scoring, keyword checks, history, and PDF export run on your iPhone: `ATSScoringService`, `LocalStorageManager`, `LaTeXStylePDFRenderer` (2.0.0+: AI features are the exception)
- No account needed: `AIClient` uses an anonymous install id, no sign-up
- AI rewrites, Improve Resume, and cover letters (2.0.0+): `AIRewriteService`, `ai-worker/src/tasks.ts`
- Contact details are removed before anything is sent to AI: `PIIRedactor`
- AI requests are not stored: `ai-worker/src/openai.ts` (`store: false`), the Worker keeps no resume text
- Every AI suggestion is checked; anything adding skills, numbers, or employers you didn't write is discarded: `RewriteValidator`
- You review every AI change before it's applied: `ImproveReviewSheet`, `BulletRewriteSheet`
- Free AI trial (3 actions), then the Rezumate AI subscription: `ai-worker/wrangler.jsonc`, `AIPaywallSheet`
- iPhone / App Store only: README, `APP_STORE_URL`
- Imports PDF and DOCX: `APIClient.uploadResume`
- Paste a job description / Paste from Clipboard: `AnalyzeView`
- ATS match score out of 100: `ATSScoringService`
- Score components (Keyword Coverage, Impact Quality, Structure Readability, Formatting Risk): `ATSScoringService`
- Missing hard skills; tap one you have to add it to Skills; the score updates: 1.1.0 whatsNew, `ResultsView`
- "Only add this if you actually have it": `KeywordPlacementSheet`
- Strengthens weak wording without inventing skills, metrics or experience: `LocalAIService`, store description
- "Worked on" → "Contributed to", "Handled" → "Managed": `LocalAIService.strengthenBullet`
- ATS-friendly / ATS-safe PDF export: store description, `LaTeXStylePDFRenderer`
- Free to start (daily free usage): store description
- Lifetime Pro $14.99 one-time, no subscription: web `page.tsx` (localized pricing may vary)

## Requires evidence

- "X% of resumes are rejected by ATS" (a widely repeated, unsourced statistic)
- "Get more interviews" / "Land the job" / any outcome improvement
- "Most ATS checkers upload your resume" (a competitor generalization; phrase as a question instead)
- Any average score improvement ("+30 points")

## Prohibited / unsupported

- (2.0.0+) "100% on-device", "your resume never leaves your iPhone", "no upload": false once AI features are used
- user counts, ratings, testimonials, revenue, downloads
- conversion or success rates
- unverified time savings
- fake scarcity or deadlines
- awards or press not in evidence
- interview or job-offer guarantees (the store listing explicitly disclaims these)
- Android availability
- real company names or logos in the dramatized rejection inbox
