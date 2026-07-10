# Rezumate First App Store Launch Plan

## Summary

Current status: Rezumate is a functional native iOS MVP with PDF/DOCX import, local ATS-style scoring, missing keyword detection, weak bullet detection, local history, rewrite acceptance, and PDF export. It is not App Store ready yet.

Estimated distance to first release: about 2-4 focused weeks if v1 ships with a useful Free plan, a one-time Pro unlock, and honest "local resume optimization" positioning. Longer if real on-device Llama inference or polished analytics are added before launch.

Primary launch strategy:

- Ship `Rezumate` as a freemium worldwide English app with a one-time Pro unlock.
- Do not claim real Llama/Neural Engine AI until actual inference is integrated and verified.
- Position v1 around private, on-device ATS scoring, keyword gaps, bullet improvement suggestions, and PDF export.

Apple references used for compliance:

- App Review requires complete, accurate metadata and tested functionality: https://developer.apple.com/app-store/review/guidelines/
- App name max 30 chars, subtitle max 30 chars, privacy policy required: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Promotional text max 170 chars, description max 4000 chars, keywords max 100 bytes, support URL required: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- App privacy disclosures must match collected data: https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy

## Key Changes

- Remove the release auth gate. The current "Sign in with Apple" flow creates a fake local session and is unnecessary for a local-only app. v1 should open directly into the app with optional local storage only.
- Rename all user-facing "Llama", "Neural Engine", and "AI refinement/Groq" copy to honest language such as "local bullet suggestions" or "rules-based rewrite suggestions."
- Remove or quarantine unused backend/API configuration from release builds, including `REZUMATE_API_BASE_URL`, unless a real backend is intentionally launched.
- Add `PrivacyInfo.xcprivacy` and align App Store privacy labels with actual behavior.
- Add a real launch checklist for device testing: import PDF, import DOCX, analyze JD, accept rewrite, delete history item, export/share PDF, offline behavior, first launch, cold launch, and large document handling.
- Add focused tests for ATS scoring, keyword extraction, bullet detection, storage encode/decode, and PDF export creation.
- Generate App Store screenshots from real app screens after copy cleanup: upload flow, score breakdown, missing keywords, bullet suggestions, export/history.
- Deploy the web support/privacy/terms pages to `https://rezumate.app` before submission and ensure support page includes a reachable email.

## App Store Metadata

App name:

```text
Rezumate
```

Subtitle:

```text
Private Resume ATS Checker
```

Keywords:

```text
resume,CV,ATS,jobs,job search,career,PDF,bullets,interview,applicant,tracker
```

Promotional text:

```text
Tailor resumes to job descriptions with private, on-device ATS scoring, keyword gaps, bullet improvements, and clean PDF export.
```

Description:

```text
Rezumate helps you tailor your resume for each job application directly on your iPhone.

Upload a resume, paste a job description, and get a private, on-device analysis showing your ATS-style match score, matched keywords, missing keywords, formatting risks, and weak bullet points.

Key features:
- Import PDF and DOCX resumes
- Paste any job description
- See a role-specific ATS-style score
- Find missing skills and keywords
- Identify weak or vague bullet points
- Improve bullets with local writing suggestions
- Save tailored resume variants on your device
- Export a clean, ATS-friendly PDF

Privacy-first by design:
Your resume text and job descriptions are processed locally on your device. Rezumate does not upload your resume, career history, or pasted job descriptions to a resume analysis server.

Rezumate is built for students, active job seekers, software engineers, and professionals who want a faster way to tailor resumes without giving sensitive career data to cloud resume tools.

Important:
Rezumate provides resume writing and formatting guidance only. It does not guarantee interviews, job offers, recruiter decisions, or applicant tracking system outcomes. Always review suggestions carefully and keep your resume accurate and truthful.
```

Category:

```text
Productivity
```

Secondary category:

```text
Business
```

Age rating:

```text
4+
```

Assumption: no user-generated sharing, web browsing, messaging, or objectionable content is added.

Privacy Policy URL:

```text
https://rezumate.app/privacy
```

Support URL:

```text
https://rezumate.app/support
```

Marketing URL:

```text
https://rezumate.app
```

Copyright:

```text
2026 Aftaab
```

App Review notes:

```text
Rezumate is a local resume optimization app. No account is required in this version. Reviewers can use the app by importing a text-based PDF or DOCX resume, pasting a job description, running analysis, viewing keyword and bullet feedback, and exporting a PDF.

Resume parsing, scoring, history, and export run locally on device. The app does not upload resume text or job descriptions to a backend service in v1.
```

Privacy label default:

```text
Data Not Collected
```

Use this only if the release build truly has no analytics, no backend uploads, no account collection, no third-party tracking SDKs, and no crash reporter collecting identifiers. If any telemetry is added, update this label before submission.

## Test Plan

- Verify an iPhone Release build in Xcode and archive successfully.
- Run manual QA on a real device, not only Simulator.
- Test offline mode after first install: import, analyze, rewrite suggestion, save history, export PDF.
- Test malformed/scanned PDF behavior and show clear errors.
- Test DOCX parsing with multiple common resume templates.
- Confirm no release UI contains hardcoded demo text such as "Hello, Arjun," "Groq," "Llama," or "Neural Engine."
- Confirm `npm run build` for the web app after installing dependencies; the planning environment could not build because `next` was not installed.
- Confirm Xcode build in an unrestricted local environment; the planning environment blocked DerivedData/CoreSimulator writes, so build health was unverified there.

## Submission Readiness Checklist

### 1. Xcode Build & Signing

- [ ] Open `ios/RezumateNative.xcodeproj` in Xcode.
- [ ] Confirm bundle identifier is `com.aftaab.rezumate`.
- [ ] Confirm Apple Developer Team is correct.
- [ ] Confirm version is `1.0` and build number is incremented.
- [ ] Run the app on a real iPhone in Debug.
- [ ] Build Release for a physical iPhone.
- [ ] Archive successfully in Xcode.
- [ ] Validate archive successfully.
- [ ] Upload archive to App Store Connect successfully.

### 2. Real Device QA

- [ ] First launch opens directly into the app with no login screen.
- [ ] PDF import works with a normal text-based resume.
- [ ] DOCX import works with a normal resume.
- [ ] Scanned/image-only PDF shows a clear extraction warning or failure.
- [ ] Large resume file does not crash the app.
- [ ] Empty or very short job description cannot run analysis.
- [ ] Normal job description generates an ATS-style score.
- [ ] Matched keywords render correctly.
- [ ] Missing keywords render correctly.
- [ ] Weak bullets render correctly.
- [ ] Local writing suggestions generate without network.
- [ ] Accepting a suggestion updates saved resume text.
- [ ] Re-analysis works after accepting a suggestion.
- [ ] History saves a completed analysis.
- [ ] History item opens correctly.
- [ ] History item delete works.
- [ ] PDF export creates a readable PDF.
- [ ] Share sheet opens for exported PDF.
- [ ] Offline mode works after first install for import, analysis, suggestions, history, and export.
- [ ] Cold launch after force quit restores local state gracefully.

### 3. Release Copy & Claims

- [ ] No release UI says `Llama`.
- [ ] No release UI says `Groq`.
- [ ] No release UI says `Neural Engine`.
- [ ] No release UI says `Sign in with Apple`.
- [ ] No release UI says `Hello, Arjun`.
- [ ] App copy uses `ATS-style`, not guaranteed ATS outcomes.
- [ ] App copy uses `local writing suggestions`, not unverified AI/model claims.
- [ ] App Review notes match actual app behavior.

### 4. Privacy & Compliance

- [ ] `PrivacyInfo.xcprivacy` is included in the app target resources.
- [ ] App does not include analytics SDKs.
- [ ] App does not include crash reporting SDKs that collect identifiers.
- [ ] App does not upload resume text or job descriptions to a server.
- [ ] App Store privacy label is set to `Data Not Collected`.
- [ ] Privacy policy matches the shipped behavior.
- [ ] Support URL is reachable.
- [ ] Privacy Policy URL is reachable.
- [ ] Terms page is reachable.

### 5. Web & URLs

- [ ] `npm ci` succeeds in `web/`.
- [ ] `npm run build` succeeds in `web/`.
- [ ] Deploy marketing site to `https://rezumate.app`.
- [ ] Verify `https://rezumate.app/privacy`.
- [ ] Verify `https://rezumate.app/support`.
- [ ] Verify `https://rezumate.app/terms`.
- [ ] Support page includes reachable email `aftaab@aftaab.dev`.

### 6. App Store Connect Assets

- [ ] Create App Store Connect app record for `Rezumate`.
- [ ] Enter app name: `Rezumate`.
- [ ] Enter subtitle: `Private Resume ATS Checker`.
- [ ] Enter category: `Productivity`.
- [ ] Enter secondary category: `Business`.
- [ ] Enter age rating: `4+`.
- [ ] Enter keywords from this plan.
- [ ] Enter promotional text from this plan.
- [ ] Enter description from this plan.
- [ ] Enter support, privacy, and marketing URLs.
- [ ] Generate screenshots from real cleaned app screens.
- [ ] Upload required iPhone screenshots.
- [ ] Add App Review notes from this plan.
- [ ] Select uploaded build.
- [ ] Submit for review.

## Assumptions

- v1 uses a useful Free plan plus a one-time StoreKit Pro unlock: $7.99 launch price, then $14.99 regular price worldwide.
- Launch is worldwide English.
- The app will not claim real Llama/on-device AI until actual inference exists.
- App Store metadata should prioritize compliance and trust over aggressive claims.
- "ATS-style" is used instead of guaranteeing actual ATS results.
