# Critique: private-apply

Reviewed from rendered frames: contact sheets every 15f plus exact frames around each cut. Renders v1–v4 were reviewed; the scores below are for the final cut (`private-apply.mp4`).

## Round 1 (v1) → fixes applied

| # | Problem seen in frames | Fix |
|---|---|---|
| 1 | Shot 7 pan pushed "Contributed to" off-screen, so the key word was never readable | Redesigned: each verb is 124px with a highlighter block that rolls from yellow to green, the rest of the bullet sits underneath, and there's no lateral pan |
| 2 | Shot 3 → 4: shot 3's z-indexed phone and headline rendered *above* shot 4 (stacking context leak), showing two phones | `isolation: isolate` on every shot wrapper, and shot 4's phone now starts exactly where shot 3's phone sits (a true match cut) with the lock screen dissolving into Analyze |
| 3 | Shot 1 macro was so tight the button read "UBMIT APPL…" | Macro reduced to ×1.5 so the full "SUBMIT APPLICATION" reads at frame 0, plus an "APPLICATION Nº 29→38" counter on the first frame |
| 4 | Shot 5 focus zoom cropped the score card edges | Focus scale 1.32 → 1.12, origin centered on the card |
| 5 | PII chips piled up on each other, and the "Keep it on your iPhone" headline collided with the cloud | Chips laid out on two rows, and the cloud strike and exit finish before the headline enters |

Also: shot 4 step tags moved to the lower-left so they never cover a tapped control, the shot 8 phone was enlarged and its headline brought in earlier (no dead top third), and the end card was re-centered.

## Final scores

| Axis | Score | Verdict |
|---|---|---|
| Hook | 8 | Application counter + tap + "Applied. Again." with a slam of rejection mail reads muted in under 2s |
| Visual quality | 8 | Uses the app's real brutalist tokens (ink borders, hard shadows, paper), so it looks directed rather than templated |
| Pacing | 8 | 10 shots in 30s, cuts on the 120 BPM grid, drop at 8.0s on the paper wipe, final hit at 27.0s on the iris |
| Product clarity | 9 | Upload → paste → score → add skill → stronger verb → PDF are all shown on the real UI layout |
| Emotional impact | 7 | Dark-to-paper chaos → calm lands; the pain section could hold one beat longer |
| Originality | 8 | The Submit-button callback (shot 1 ↔ shot 9) and PII chips pulled back into the phone are specific to this product |
| Conversion potential | 7 | Clear job and trust story; no price shown (deliberate, to keep the CTA simple) |
| Cinematography | 8 | Macro, 3D top-down scan, phone rise, 3/4 swing, full-bleed UI, verb macro, pull-out, iris. No consecutive same-scale device shots |
| Authenticity | 8 | UI copy and scoring behavior are taken from the SwiftUI source; sample data is disclosed on the end card |
| CTA | 8 | "Know before you apply." + Download on the App Store + "iPhone only · Free to start" |

Slideshow test: pass. AI-ad test: no gradients or glows (except the scan laser), spring is limited to tags/pills/icon, no hollow slogans.

## Claims re-check (final)

Every on-screen line maps to CLAIMS.md → Verified: Keep it on your iPhone · Processed on this iPhone · Scored against this job · the "Only add this if you actually have it" sheet copy · Stronger wording, nothing invented · Worked on→Contributed to / Handled→Managed (exact `LocalAIService` rules) · ATS-safe PDF · On-device / No account / No upload · iPhone only · Free to start.
The "Application Nº 38" counter, "Hiring Team" rejection emails, "Someone's server" cloud, and Alex Morgan resume are dramatizations or sample data, not product claims. No real employers are named.

## Remaining ideas (not yet done)

1. Replace the rebuilt UI with real simulator recordings of the same flow once captured (highest authenticity lift).
2. Replace the synthesized music with a licensed track for paid placements.
3. Hook variants (see hooks.md): privacy-first open ("Upload your whole career?") and result-first open (a red 58 stamping into a green 81).
