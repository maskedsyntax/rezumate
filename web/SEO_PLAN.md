# Rezumate website growth and SEO plan

Updated September 29, 2026. The theme stays aligned with the iPhone app.

## What the website should do

1. Give a visitor an immediate, useful result: compare a real resume with a real job description in the browser.
2. Show why the result was produced: matched and missing terms, four score components, and one concrete next step. Never describe an ATS-style estimate as an employer's actual screening score.
3. Show the actual product workflow and its limits with a transparent sample. Use customer quotes only when the speaker and wording are approved for publication; collect permission and outcome context before using them as evidence.
4. Bring qualified search visitors to the checker and the iPhone app through pages that answer a distinct intent. Avoid publishing many near-duplicate keyword pages or generic resume advice.

## Current launch pages

| URL | Search intent | Why it earns a page | Conversion |
| --- | --- | --- | --- |
| `/` | Rezumate / private iPhone resume app | Product overview, sample workflow, pricing, feedback | Free checker, App Store |
| `/resume-checker` | resume job match checker / free ATS-style resume check | Working browser tool with score explanation and limits | Run check, then App Store |
| `/private-resume-checker` | private resume checker / no account resume check | Explains browser and iPhone data handling and tradeoffs | Run check |
| `/faq`, `/privacy` | brand trust and objections | Specific answers about scoring, privacy, files, price | Checker or App Store |

These are query hypotheses, not measured search volume claims. Validate them in Search Console after indexing.

## Next pages, only when there is real product evidence

1. **Resume vs job description matching:** a deeper guide using real, anonymized examples and a working check. Target the question “why didn't this resume match this role?” rather than repeating the checker page.
2. **How Rezumate scores a resume:** explain the four components, supported skills, extraction limits, and a worked example. Publish only after checking every rule against the current iOS scorer and browser preview.
3. **ATS-safe PDF export on iPhone:** use actual app screenshots and a real export to demonstrate selectable text, section structure, and what the app can and cannot guarantee.
4. **Role-specific examples:** add only for roles where we have permissioned before-and-after examples and enough unique findings. Do not mass-generate job-title pages.

## Technical SEO checklist

- Keep canonical URLs and the XML sitemap on `https://www.rezumate.app`, which is the live redirect destination.
- Give each page a unique title, description, H1, canonical, and internal links. Keep the checker content visible to crawlers while the personal result remains client-side.
- Submit the sitemap in Google Search Console, inspect index coverage, and check mobile usability and Core Web Vitals after deployment.
- Use structured data only where it matches visible page content and Google's current eligibility rules. Do not mark user quotes as aggregate ratings or promise FAQ rich results.
- Keep the checker fast: lazy-load PDF and DOCX libraries when a file is selected; do not send resume contents to analytics.

## Measurement for the first six weeks

| Weekly metric | Source | Interpretation |
| --- | --- | --- |
| Indexed launch pages and crawl issues | Search Console | Whether Google can discover the tool and trust pages |
| Non-brand impressions, clicks, and query/page pairs | Search Console | Which intents bring qualified visitors |
| Checker starts, successful checks, and App Store CTA clicks | Privacy-respecting aggregate event counters if added | Whether the tool earns the app handoff; avoid resume/JD payloads and session identifiers |
| App Store product-page views and downloads from website campaigns | App Store Connect / campaign links | Whether website visits lead to installs |
| Feedback on score clarity and file failures | Voluntary support feedback | Which part of the experience to improve |

At week two, refine titles and page copy using actual search queries. At week four, add the strongest evidence-backed page above. At week six, compare checker-to-App-Store engagement against the homepage CTA and keep the clearer path.

Reference: [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [Search Console guidance](https://developers.google.com/search/docs/fundamentals/get-started).
