<div align="center">

<img src="web/public/rezumate-logo.png" alt="Rezumate logo" width="96" height="96">

# Rezumate

**100% On-Device, Private Resume Optimization for iOS.**

</div>

Rezumate helps job seekers upload a resume, paste a job description, get instant ATS-focused matching, rewrite weak bullet points, and export an ATS-safe PDF, processed entirely locally on their iPhone.

---

## Why On-Device?

Resumes contain highly sensitive personal information, including names, phone numbers, email addresses, and full career history. Standard resume builders upload this data to third-party cloud servers. 

Rezumate processes everything in-memory and stores history in secure, local sandboxed storage on the device. Resume analysis and writing suggestions run locally, keeping sensitive resume data private.

---

## Repo Layout

- `ios/` - Native SwiftUI iOS app, built for App Store release.
- `web/` - Next.js marketing website containing waitlist, privacy, and support pages.

---

## Native iOS App

Open the Xcode project:

```bash
open ios/RezumateNative.xcodeproj
```

The app runs 100% locally and includes:
- **Local Document Parsers:** In-memory parsing of PDFs (`PDFKit`) and Word Documents (`DocxTextExtractor` ZIP XML scanner).
- **Deterministic ATS Scoring:** Local calculations for keyword match, structure quality, and formatting warning checks.
- **Local Writing Suggestions:** Rules-based bullet improvements run locally on device.
- **Local Storage:** Saved variants and scoring history are persisted locally in secure, sandboxed storage via JSON structures.
- **On-Device Export:** Generates clean, selectable, single-column ATS-safe PDFs directly from local SwiftUI layout bounds.

*Note: The app opens directly into a local workspace and does not require an account for the first release.*

---

## Marketing Website

```bash
cd web
npm install
npm run dev
```

The marketing site serves as the landing page and waitlist capture. It can be deployed statically to Vercel, Netlify, or similar hosts.
