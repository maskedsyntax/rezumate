# Product

<!-- Update stale sections. Do not wipe human-written notes. -->

## Overview

Rezumate ("Rezumate: ATS Resume Checker") is an iPhone app that compares a PDF/DOCX resume against a pasted job description, gives an ATS-style match score, lists missing and matched keywords, flags weak bullets, and exports a clean ATS-friendly PDF. All of it runs on the phone. Nothing is sent to a server.

## Primary value proposition

Tailor your resume to each job before you apply, without uploading your career history anywhere.

## Platforms

- iOS (App Store): live. This is the only platform ads may point to.
- Android: in development in the repo (`android/`), not released. Do not advertise it.
- Web (`web/`): marketing site only.

## Pricing

- Free: 3 analyses/day, 3 improvements/day, 2 saved variants, PDF export included.
- Lifetime Pro: $14.99, one-time payment (localized App Store pricing may vary). Unlimited use, full score diagnosis, complete keyword insights.

## Strongest features

1. ATS match score (0–100) with four components: keyword coverage, impact quality, structure/readability, formatting risk (`ATSScoringService.swift`).
2. Missing hard skills: tap one you actually have to add it to Skills, optionally in a bullet you pick. The score updates right away (1.1.0).
3. Improve Resume: conservative verb upgrades ("Worked on" → "Contributed to", "Handled" → "Managed"). It never adds skills, metrics or experience (`LocalAIService.swift`).
4. LaTeX-style ATS-safe PDF export with selectable text.
5. Local history of saved variants.

## Differentiators

- Runs 100% on-device. `APIClient` is local, and the only URLs in the app are support, privacy and terms links.
- No account.
- One-time Pro purchase instead of a subscription.
- Truthful suggestions: it refuses to invent qualifications.

## Main workflows

Upload resume (PDF/DOCX) → paste JD (or Paste from Clipboard) → Analyze → Results (score, breakdown, missing skills, partial matches, matched keywords, issues) → add skills / Improve Resume → Preview & Export PDF.

## Strongest demo moments

- Score box counting up, with the color (red/yellow/green) set by the score.
- Tapping a yellow missing-skill chip, then "Add to Skills", then the score ticks up.
- A weak bullet's verb swapping to a stronger one.
- The clean PDF sliding out.

## Privacy / trust

Resume, JD, analysis, suggestions and history stay in local sandboxed storage. There's no account and no upload. The store listing disclaims any guarantee of interviews or ATS outcomes, so ads must not promise them.
