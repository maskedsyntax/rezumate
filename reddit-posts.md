# Rezumate: Reddit posts

Story-first, no "I just launched my app" framing. Each post earns the click on its own; the app is a one-line mention at the end, not the hook. Blog links are the primary CTA, not the App Store link. That's what keeps these from reading as ads and is what most of these subs' self-promo rules actually require.

Swap `rezumate.app` for the live domain before posting if different.

---

## Group 1: Solopreneur / indie hacker / programming subs

**Where:** r/SideProject, r/IndieHackers (via their site or crosspost), r/EntrepreneurRideAlong, r/iOSProgramming, r/swift, r/programming (only if framed as pure engineering, no product mention at all, see note)

**Blog link:** https://rezumate.app/blog/on-device-resume-scoring

### Post 1A: r/SideProject / r/IndieHackers / r/EntrepreneurRideAlong

**Title:** I rebuilt my resume-scoring feature to run with zero backend, and it made the product better, not worse

**Body:**

When I started building a resume-to-job-description matcher, I did what everyone does: client uploads a resume, server parses it, a model scores it, client polls for the result. Standard SaaS shape. It worked. Then I sat with what I'd actually built for a minute and didn't like it.

A resume is one of the most identity-dense documents a person owns: full name, phone, email, address history, employer names, sometimes salary context buried in bullet points. The second you build "upload your resume, get a score," you've also built a resume collection pipeline, whether that was the intent or not. Now you need a retention policy, a breach response plan, and an honest answer to "how long do you keep this."

That felt like a lot of liability for what is, underneath, mostly string matching and light NLP. So I threw the backend away and rebuilt the whole thing to run on-device: parsing, keyword extraction, scoring, bullet rewriting, PDF export, all of it, with zero network calls.

The technical tradeoffs were real. No hotfixing a scoring bug without an App Store review cycle, no server-side analytics on what's failing and why, every rule has to earn its place in the binary. But I got something back that I think matters more for this specific type of data: there's no database of people's resumes sitting on a server I have to defend or eventually explain in a breach notice.

Wrote up the actual implementation details (PDF/DOCX parsing without a server, how the scoring rubric is structured, why I explicitly designed the rewrite flow to never invent a metric the user didn't already imply) here: https://rezumate.app/blog/on-device-resume-scoring

Curious if anyone else building in a similarly sensitive-data space (health, finance, career) has made the same call, or came out the other side deciding the backend was worth it anyway.

*(Disclosure: this is from my own product, Rezumate, a resume tool for iPhone. Not pitching it here, just the architecture decision.)*

---

### Post 1B: r/iOSProgramming / r/swift

**Title:** Parsing resumes and generating ATS-style scores entirely on-device in Swift, no server round trip

**Body:**

Been heads-down on a feature where the constraint was: no part of the pipeline is allowed to touch a network call. Resume in, ATS-style score and keyword gap analysis out, entirely on-device.

A few things that were harder than expected:

- **PDF/DOCX parsing without a server.** PDFKit gets you most of the way for text-based PDFs. DOCX is just a zip of XML under the hood (`word/document.xml`), so you can walk it directly instead of reaching for a heavy parsing library. The real edge case is scanned/image-based resumes with no text layer. I decided against bolting on OCR just for that minority case and instead surface a clear "we can't read this file" state rather than silently producing a garbage score.
- **Scoring without an LLM API.** Turned out a well-weighted rules engine (keyword coverage, impact-language patterns, structure/readability, formatting-risk detection) beats a model call here. It's deterministic, fast, and I can actually explain *why* a resume scored 62 instead of 87, which matters a lot for a scoring feature.
- **Rewriting bullets without inventing facts.** This was more of an ethics constraint than a technical one. A rewrite feature is one bad prompt away from fabricating a metric someone never achieved, so the rewrite logic only strengthens verbs and phrasing, never adds a number that wasn't already implied.

Longer write-up with the actual architecture: https://rezumate.app/blog/on-device-resume-scoring

Happy to go deeper on any part of this. The DOCX XML walking in particular was more annoying than I expected going in.

*(This is the engine behind my app, Rezumate. Mentioning for context, not pitching.)*

---

### Note on r/programming

That sub tends to reject anything with a product link, even a soft one. If you want a presence there, strip the last two paragraphs entirely (no blog link, no disclosure, no app mention) and post it as a pure "here's an interesting constraint and how I solved it" writeup. Only worth doing if you're fine with zero traffic back to the site from it. It's a credibility/visibility play, not a funnel.

---

## Group 2: Resume / job search subs (privacy angle)

**Where:** r/resumes, r/jobs, r/cscareerquestions, r/careerguidance

**Blog link:** https://rezumate.app/blog/what-your-resume-file-reveals

⚠️ **r/resumes specifically bans self-promotion and product mentions in the body.** For that sub, use Post 2A-strict (no app mention at all, blog link only, and only if the mods' current rules allow outbound links, check the sidebar before posting since this changes).

### Post 2A: r/jobs / r/careerguidance

**Title:** Ran a test: uploaded a resume to 4 "free ATS checkers," then checked what they actually store

**Body:**

Kept seeing "run your resume through an ATS checker" as generic job search advice, so I actually looked into what happens on the other end of that upload.

A resume file is not just the text you see. A DOCX is a zip archive. Rename one to `.zip` and open it, and you'll find `docProps/core.xml`, which routinely stores the document author's name and sometimes a company field left over from whatever template you built it from years ago. A PDF carries its own metadata block with creation app, author, and timestamps. None of this is usually a big deal on its own, but almost nobody scrubs it before uploading, because almost nobody knows it's there.

Then there's the upload itself. When you hand your resume to a free checker, the file leaves your device and lands on a server, at minimum temporarily, so it can be parsed and scored. A lot of these tools are, structurally, lead-generation funnels for a resume-writing or recruiting upsell. That's not necessarily shady, it's just the business model, but it means your full name, phone number, address, and career history are the thing generating the lead, not just a document being scored.

Questions worth asking before you upload a resume anywhere:

- Is the file deleted after scoring, or retained?
- Is my contact info used for anything beyond the score itself?
- Does the privacy policy say this in plain language, or is it vague on purpose?

Full breakdown of the file-format stuff and how to sanity-check any tool's privacy claims (there's a simple network-off test that works on basically anything) here: https://rezumate.app/blog/what-your-resume-file-reveals

Not saying don't use ATS checkers. Just know what you're handing over when you do.

*(I make an on-device resume tool called Rezumate, mentioned in the post. Flagging that up front rather than burying it.)*

---

### Post 2A-strict: r/resumes (no product mention, check sub rules before posting)

**Title:** PSA: your resume file has more in it than the text you see (metadata + what "free ATS checker" uploads actually do)

**Body:**

Quick thing worth knowing before you run your resume through a random online checker.

A DOCX is a zip file. Rename one to `.zip`, open it, and look at `docProps/core.xml`. It often has the document author's name and sometimes a leftover "company" field from whatever template you copied to build your current resume. If you've been editing the same file since your last job, that metadata can carry over without you noticing. PDFs have a similar metadata block (creation app, author, timestamps).

More relevant: when you upload your resume to a free "ATS score" tool, the file goes to a server somewhere so it can be parsed. Some of these are genuinely just checking your resume. A lot of them are lead-gen for a resume-writing or recruiting upsell, using your resume (name, phone, email, full work history) as the thing that generates the lead.

Before uploading anywhere, it's worth checking:

- Does the privacy policy say plainly whether the file is deleted or retained?
- Is your contact info used for anything beyond the score?

Wrote up the file-format details and a simple way to test any tool's "we don't upload your data" claim (turn off your network and see if it still works) here if useful: https://rezumate.app/blog/what-your-resume-file-reveals

---

### Post 2B: r/cscareerquestions

**Title:** The resume file you're sending has more baked into it than the words on the page

**Body:**

Half-related to the constant "should I use an ATS checker" threads here. I actually dug into what a resume *file* contains beyond visible text, since a lot of us have been recycling the same DOCX since undergrad.

DOCX files are zip archives. `docProps/core.xml` inside one routinely holds the document author's name and, if you built your current resume by copy-pasting an old one, sometimes a stale "company" field from years back. PDFs carry a comparable metadata block (creating app, author, timestamps). Mostly harmless, but worth knowing it's there, especially if you've been passing the same file around since a previous job.

The bigger thing: every time you upload that file to a "free ATS score" site, it leaves your machine and sits on a server somewhere to get parsed. Some tools are straightforward about this. A good number are lead-gen for a resume-writing upsell. Your resume, contact details included, is the thing generating the lead.

Went deeper on the actual file structure and a quick way to test any tool's privacy claims yourself: https://rezumate.app/blog/what-your-resume-file-reveals

*(I build an on-device resume tool, Rezumate, for context. Not the point of the post, just disclosing.)*

---

## Group 3: iOS / app-dev technical subs

**Where:** r/AppDevelopers, r/appledevelopers, r/iosdev, r/iosapps, r/IndieDev, r/AppBuilding, r/developersIndia, r/vibecoding

**Blog link:** https://rezumate.app/blog/on-device-resume-scoring

**Flair guidance:** These subs generally split flairs into something like "Discussion," "Show and Tell," "Question," and "Self Promo." Pick "Discussion" or the sub's story/build-log equivalent over anything explicitly "Promo," for the same reason as r/indiehackers: the post is a technical decision told as a story, not a pitch.

Each post below hits a different specific detail so they don't read as the same post copy-pasted across subs. Reuse the ones that fit; don't post all eight, most of these subs overlap in membership.

### Post 3A: r/AppDevelopers

**Title:** Built resume ATS scoring without a backend. The parsing problem took longer than the scoring did.

**Body:**

Went into this assuming scoring a resume against a job description would be the hard part. It wasn't. Parsing was.

PDFKit handles text-based PDFs fine. DOCX is a zip archive of XML, so `word/document.xml` is walkable directly without a heavy parsing dependency. The actual problem is scanned or image-based resumes with no text layer at all. I looked at bolting on OCR to cover that case and decided against it. It would have meaningfully bloated the app for a minority of files, so instead the app tells the user plainly when it can't extract usable text instead of quietly producing a garbage score off nothing.

Once parsing was solid, scoring turned out to be a fairly boring weighted rules engine: keyword coverage, impact-language patterns, structure, formatting risk. No model call needed for any of it.

Wrote up the full pipeline here if useful: https://rezumate.app/blog/on-device-resume-scoring

*(This is from my resume app, Rezumate, mentioned for context.)*

---

### Post 3B: r/appledevelopers

**Title:** PDFKit got me 90% of the way to on-device resume parsing. Here's the other 10%.

**Body:**

Building a feature that parses resumes and scores them against a job description, with a hard constraint of no network calls at all. PDFKit covers text-based PDF extraction well out of the box, which was most of the battle. The remaining 10% was DOCX, which isn't a PDFKit problem at all, it's just a zip file with an XML document inside (`word/document.xml`) that you walk manually.

The one case I chose not to solve: scanned/image resumes with no embedded text layer. OCR would have been the "complete" answer, but it's a real size and complexity cost for a minority of files, so the app just tells the user clearly it can't read that file rather than faking a score.

Full writeup on the parsing and scoring pipeline: https://rezumate.app/blog/on-device-resume-scoring

*(Built this for my app, Rezumate, an on-device resume tool, mentioned for context not pitching.)*

---

### Post 3C: r/iosdev

**Title:** Skipped Core ML and an LLM API for resume scoring, went with a plain weighted rules engine instead

**Body:**

Kept expecting to reach for a model for the scoring step (keyword matching, bullet quality, ATS-style score out of a resume + job description). Ended up not needing one.

The scoring breaks into four independently computable pieces: keyword coverage, impact-language quality (weak-verb/passive-construction detection), structure and readability, and formatting-risk detection (tables, columns, image-heavy layouts that are known to break real ATS parsers). All four are rules-based and run instantly on-device, no Core ML model bundled, no API call.

The upside I didn't expect going in: it's fully explainable. I can point to exactly why a resume scored 62 instead of 87, because the score is a sum of inspectable parts, not a black box. That mattered more than I thought it would once real users started asking "why did I get this score."

Wrote up the actual weighting and structure here: https://rezumate.app/blog/on-device-resume-scoring

*(Shipped as my app, Rezumate, for context.)*

---

### Post 3D: r/iosapps

**Title:** Shipped an app where literally nothing calls out to a server, on purpose

**Body:**

Rezumate is a resume-scoring app, parse a resume, paste a job description, get a match score and keyword gaps, improve weak bullets, export a clean PDF. The whole thing runs without a single network request. No account, no upload, no analytics pinging home.

That constraint came from the data itself, not from a privacy trend I wanted to ride. A resume is basically a condensed identity file: name, phone, address, full career history. Building the standard "upload to a server, get a score back" version of this felt like building a resume-collection pipeline I didn't actually want to be responsible for.

Wrote up the technical side of how the parsing/scoring/export all stay local: https://rezumate.app/blog/on-device-resume-scoring

Live on the App Store if anyone wants to poke at it: https://apps.apple.com/us/app/rezumate-ats-resume-ai/id6787700238

---

### Post 3E: r/IndieDev

**Title:** The hardest part of building offline-first wasn't the code, it was resisting the urge to add a backend "just in case"

**Body:**

Every few weeks while building this I'd hit a feature that would be trivially easier with a server: usage analytics, remote config for scoring weights, A/B testing copy, the works. Every time, I had to actually ask whether it was worth breaking the one constraint that made the product make sense, that a resume never leaves the phone.

It held. Parsing, ATS-style scoring, keyword matching, bullet rewriting, PDF export, all local. The cost was real: no hotfixing a scoring bug without an App Store review cycle, no server logs to debug from when something breaks for one user. But there's no resume database sitting on a server I have to defend, which is the tradeoff I actually wanted for this specific kind of data.

Full writeup on the architecture and where it got genuinely hard (DOCX parsing, mainly): https://rezumate.app/blog/on-device-resume-scoring

*(My app, Rezumate, for anyone curious what it turned into.)*

---

### Post 3F: r/AppBuilding

**Title:** How much can you actually build without a server? Tried to find out with a resume-scoring app.

**Body:**

Set myself a constraint before writing any code: parsing, scoring, keyword matching, rewriting, history, PDF export, all of it had to run without a network call. Curious how far "no backend" could actually go for something that looks, on the surface, like it obviously needs one.

Turns out further than expected. File parsing is a local library problem (PDFKit for PDFs, direct XML walking for DOCX). Scoring didn't need a hosted model, a weighted rules engine covering keyword coverage, bullet quality, structure, and formatting risk did the job and is fully explainable as a bonus. Even the final PDF export renders locally.

What it cost me: no server-side analytics, no hotfixing without an app store review, and OCR for scanned resumes was out of scope since that's genuinely hard to do well on-device without bloating the app.

Wrote up the details: https://rezumate.app/blog/on-device-resume-scoring

---

### Post 3G: r/developersIndia

**Title:** Built and shipped a resume-scoring iOS app solo, entirely on-device. Some notes on what that actually took.

**Body:**

Been building this on the side, an app that scores a resume against a job description (ATS-style), flags missing keywords and weak bullets, and exports a clean PDF. The constraint I set for myself was that none of it touches a server, resume text and job description text never leave the phone.

Practically, that meant: PDF/DOCX parsing using local frameworks instead of a hosted parsing service, a weighted rules engine for scoring instead of an LLM API call (deterministic, fast, and I can explain exactly why a resume scored what it scored), and local PDF generation for the final export.

The honest tradeoff: shipping this way is slower than a typical client-server app. Every scoring rule has to earn its place in the binary since I can't hotfix logic without going through App Store review. But for a document that's basically a person's identity and career history condensed into one file, not having a server-side resume database felt like the right call.

Full technical writeup: https://rezumate.app/blog/on-device-resume-scoring

*(This is my app, Rezumate, mentioned for context, not the point of the post.)*

---

### Post 3H: r/vibecoding

**Title:** Used AI-assisted coding to build most of this app, but the one thing I didn't let it decide was the architecture

**Body:**

Built a resume-scoring app leaning heavily on AI pair-programming for the actual Swift implementation, parsing logic, UI, scoring math. Where I stayed strict and didn't let the tooling drift was the architecture constraint I set at the start: no backend, ever. Resume text and job description text never leave the device, full stop.

That constraint actually made the AI-assisted parts easier to reason about, not harder. Every generated function for parsing or scoring had an obvious test: does this need the network? If the honest answer was yes, I rejected the approach and asked for a local alternative. Ended up with local PDF/DOCX parsing, a rules-based scoring engine (no model call needed), and local PDF export, all AI-assisted in implementation but human-decided in shape.

Wrote up the actual pipeline here: https://rezumate.app/blog/on-device-resume-scoring

*(Shipped as Rezumate, an iPhone resume app, mentioned for context.)*

---

## Group 4: Business / build-in-public / solopreneur subs

**Where:** r/buildinpublic, r/SaaS, r/Solopreneur, r/startupsavant, r/AppBusiness, r/iOSAppsMarketing

**Blog link:** https://rezumate.app/blog/on-device-resume-scoring

**Flair guidance:** r/buildinpublic and r/Solopreneur usually have a "Progress Update" or "Journey" flair, use that over "Promotion." r/SaaS often flairs by topic ("Product," "Discussion," "Bootstrapped"); pick the one closest to a build/strategy discussion. Self-promotion is more accepted as the norm in this group of subs than in Groups 1-3, so the disclosure line can be a little more direct without hurting the post.

### Post 4A: r/buildinpublic

**Title:** Build in public update: I killed my backend instead of scaling it

**Body:**

Most build-in-public posts in this direction are about scaling infrastructure. Mine's the opposite. I had a working client-server version of my resume-scoring app, upload resume, server parses and scores it, client polls for the result, and I ripped the server out entirely.

The reason wasn't cost, it was liability. A resume is one of the most identity-dense documents most people own, full name, phone, address, employer history. The moment I built "upload your resume, get a score," I'd also built a resume-collection pipeline I hadn't actually signed up to run. So I rebuilt parsing, scoring, keyword matching, bullet rewriting, and PDF export to all happen on-device instead.

What that costs me going forward: no hotfixing scoring logic without an App Store review, no server-side usage analytics. What it buys: there's no database of people's resumes anywhere for me to eventually have to explain in a breach notice.

Full writeup on the technical side: https://rezumate.app/blog/on-device-resume-scoring

---

### Post 4B: r/SaaS

**Title:** Why I didn't make this a SaaS: the case against a subscription for a resume tool

**Body:**

Every resume-optimization competitor I looked at runs a subscription, and every one of them stores the resume on a server to do it, since that's what the recurring architecture requires. I went the other way on both counts: one-time price, and the resume never leaves the user's device.

The pricing and the architecture aren't separate decisions, the subscription model exists partly because running inference/parsing server-side has an ongoing cost that has to be recovered monthly. Once I moved parsing, scoring, and rewriting on-device, there was no recurring compute cost to justify a subscription in the first place. The business model followed the architecture, not the other way around.

Wrote up the technical side of how that works (no backend, no model API calls, a rules-based scoring engine instead): https://rezumate.app/blog/on-device-resume-scoring

*(This is Rezumate, my resume-scoring app, mentioned for context.)*

---

### Post 4C: r/Solopreneur

**Title:** Running a one-person app business with zero server costs, on purpose

**Body:**

One underrated perk of building something that runs entirely on-device: my monthly infrastructure bill for this app is zero. Not "optimized down to," zero. There's no server to scale, no database to back up, no uptime to monitor at 2am.

That wasn't the original goal, it came out of a decision to keep resumes (which carry someone's full name, contact info, and career history) off any server I'd have to run. But as a solo operator, the operational side effect turned out to matter almost as much as the privacy reasoning: fewer moving parts to maintain alone means more time actually improving the product instead of babysitting infrastructure.

Wrote up the architecture decisions behind it: https://rezumate.app/blog/on-device-resume-scoring

*(The app is Rezumate, a resume-scoring tool for iPhone, mentioned for context.)*

---

### Post 4D: r/startupsavant

**Title:** The unsexy decision that actually mattered more than any feature: no backend

**Body:**

Spent a lot of early time on features, keyword matching, bullet rewriting, PDF export, before realizing the decision that would define the product most wasn't a feature at all. It was refusing to build a backend for a resume-scoring app, even though a backend is the obvious default architecture for "upload a document, get analysis back."

The reasoning was about the data, not the tech stack. A resume is a condensed identity document. Building the standard client-server version meant building a resume-collection pipeline as a side effect of the product, whether that was the intent or not. Going local-only instead meant no database of user resumes to defend, and it turned "your data never leaves your device" into an actual architectural fact instead of a line in a privacy policy.

Full technical breakdown: https://rezumate.app/blog/on-device-resume-scoring

---

### Post 4E: r/AppBusiness

**Title:** No backend means no server bill, no data liability, and no scaling headache. Here's how that shaped the business model.

**Body:**

Every cost center people warn you about with an app that processes user documents, hosting, storage, scaling, compliance around retained personal data, disappears if the processing never leaves the device. That's the bet I made building a resume-scoring app: parsing, ATS-style scoring, keyword matching, and PDF export all run locally on iPhone.

The direct business consequence: pricing became a one-time unlock instead of a subscription, because there's no ongoing server cost to recover monthly. The less obvious consequence: support tickets about "where is my data stored" and "can you delete my resume" mostly don't exist, because the honest answer is always "it never left your phone."

Wrote up the technical architecture behind the decision: https://rezumate.app/blog/on-device-resume-scoring

*(This is my app, Rezumate, mentioned for context.)*

---

### Post 4F: r/iOSAppsMarketing

**Title:** Privacy-as-architecture turned out to be my best marketing hook, not just an engineering choice

**Body:**

Built a resume-scoring app to run entirely on-device for data-liability reasons, not marketing reasons. Only after shipping did I realize the architecture decision was also the strongest positioning I had: "your resume never leaves your phone" is a claim I can back with an actual technical fact (turn off your network, the app still works), not just privacy-policy language every competitor also uses.

That's turned into the core message across App Store copy, the launch page, and organic content: not "we care about privacy" but "here's literally what happens to your file, and it's nothing." Wrote up the underlying architecture (on-device PDF/DOCX parsing, a rules-based scoring engine instead of a model API call, local PDF export) as a technical post, mainly because I think the mechanism is more convincing than the marketing claim on its own: https://rezumate.app/blog/on-device-resume-scoring

*(App is Rezumate, mentioned for context on where this positioning came from.)*

---

## Group 5: Show-and-tell / review-exchange subs

**Where:** r/ShowMeYourApps, r/FreeAppReviews, r/IndieAppCircle

Self-promotion is the explicit norm in these subs, so unlike Groups 1-4, these are full, direct pitches, not soft mentions. Lead with the product, the pricing, and the App Store link; the blog is a secondary link for anyone who wants the technical depth, not the CTA. Pull feature language straight from the App Store listing and campaign copy so it's consistent everywhere Rezumate shows up.

**Flair guidance:** Use whatever flair matches the app category (often "iOS," "Productivity," or "Show and Tell") plus a "Feedback wanted" tag if the sub has one, feedback-framed posts get more engagement than a flat showcase even in subs where a flat pitch is allowed.

### Post 5A: r/ShowMeYourApps

**Title:** Rezumate: private ATS resume scoring on iPhone. No cloud upload, no account, one-time price ($7.99 launch offer)

**Body:**

Rezumate is a resume optimizer built entirely around one workflow: paste a job description, upload your resume, and get an ATS-style match score you can actually act on.

What it does:

- **ATS match score** out of 100, built from keyword coverage, impact quality, structure/readability, and formatting risk, with a full breakdown of why you got that score, not just the number.
- **Missing keyword detection**: extracts the skills, tools, and role terms from the job description and shows exactly what your resume is missing.
- **Bullet strengthening**: upgrades weak, vague bullets ("worked on," "responsible for") into stronger, clearer, outcome-focused language, without inventing metrics you didn't actually hit.
- **One-tap improve**: adds the missing keywords and fixes weak bullets in one flow, then re-scores instantly so you can see the before/after.
- **LaTeX-style PDF export**: clean, ATS-safe formatting with selectable text, ready to submit.
- **100% on-device**: parsing, scoring, suggestions, history, and export all run locally on your iPhone. No resume upload, no account, works with WiFi off.

Free plan gives you 3 analyses/day, 3 improvements/day, 2 saved variants, and PDF export, enough to fully test the workflow. Pro is a **one-time $7.99 launch price** (regular $14.99), unlimited everything, no subscription, no credit packs.

Get it here: https://apps.apple.com/us/app/rezumate-ats-resume-ai/id6787700238

Would love feedback from this community, especially on onboarding and whether the free tier gives enough to convince you to upgrade. Also wrote up the on-device architecture if anyone wants the technical side: https://rezumate.app/blog/on-device-resume-scoring

---

### Post 5B: r/FreeAppReviews

**Title:** Rezumate: private ATS resume scoring for iPhone, looking for honest reviews (free tier available)

**Body:**

Would really appreciate honest reviews, good or bad, on Rezumate: a resume optimizer that scores your resume against a job description, shows missing keywords and weak bullets, fixes them in one tap, and exports a clean ATS-safe PDF.

The core pitch: everything runs on-device. No resume upload, no account, no cloud AI processing. Your resume, career history, and contact info never leave your phone, and you can verify that yourself by turning off WiFi and using the app anyway.

What's included:

- ATS match score with a full component breakdown (keyword coverage, impact quality, structure, formatting risk)
- Missing keyword detection against the pasted job description
- Weak bullet detection and rewriting, truthfully, no invented numbers
- One-tap resume improvement that re-scores instantly
- Clean PDF export, ATS-safe formatting

**Free:** 3 analyses/day, 3 improvements/day, 2 saved variants, PDF export included, enough to fully try the workflow before deciding anything.
**Pro:** one-time $7.99 launch price (regular $14.99), unlimited analyses/improvements/variants, full score diagnosis, no subscription ever.

App Store: https://apps.apple.com/us/app/rezumate-ats-resume-ai/id6787700238

Happy to review other apps posted here in return, especially anything else doing on-device/local-first processing.

---

### Post 5C: r/IndieAppCircle

**Title:** Solo-built iOS app: Rezumate, private ATS resume scoring with a one-time $7.99 launch price

**Body:**

Built this solo over the last several months and just launched it. Rezumate scores your resume against a job description (ATS-style), tells you exactly what keywords and impact language are missing, fixes weak bullets in one tap, and exports a polished, ATS-safe PDF, all without your resume ever touching a server.

The full feature set:

- ATS match score (keyword coverage, impact quality, structure/readability, formatting risk) with a complete diagnosis of what's driving the number
- Missing keyword detection pulled straight from the pasted job description
- Bullet strengthening that improves wording without fabricating achievements
- One-tap improve flow that fixes gaps and re-scores immediately
- LaTeX-style PDF export, clean and ATS-safe
- 100% local processing: no account, no cloud upload, works offline

**Pricing:** free plan is genuinely usable (3 analyses/day, 3 improvements/day, 2 saved variants), Pro is a **one-time $7.99 launch price** (going up to $14.99 regular), no subscription, no credit packs, no AI meter.

App Store: https://apps.apple.com/us/app/rezumate-ats-resume-ai/id6787700238

Would genuinely value feedback from this community on the onboarding flow and whether the value prop is obvious in the first minute of using it. Technical writeup on the on-device architecture here too, if useful: https://rezumate.app/blog/on-device-resume-scoring

---

## Group 6: Job-seeker practical / student subs

**Where:** r/jobsearchhacks, r/PlacementsPrep

**Blog link:** https://rezumate.app/blog/what-your-resume-file-reveals

**Flair guidance:** Use a "Tip" or "Resource" flair if available over anything tagged "Promotion." These read as genuinely useful advice on their own; the app is a one-line mention at the end, same rule as Group 2.

### Post 6A: r/jobsearchhacks

**Title:** Hack: test any "free ATS checker" by turning your WiFi off before you upload your resume

**Body:**

Quick one that's saved me from a couple of sketchy resume sites: if a tool claims it "analyzes your resume locally" or "doesn't upload your data," turn off WiFi and cellular data, then try to use it. If it still works, it's probably telling the truth. If it breaks or hangs, your resume was headed to a server no matter what the copy on the page said.

Worth doing this before you hand over a resume anywhere, since the file itself carries more than the text you see. DOCX files are zip archives, and `docProps/core.xml` inside one often holds the document author's name and sometimes a leftover company field from an old template. PDFs carry a similar metadata block. None of that's usually a big deal, but combined with a server upload of your full name, phone number, and career history, it adds up to more than most people realize they're handing over for a free score.

Wrote up the full breakdown here: https://rezumate.app/blog/what-your-resume-file-reveals

*(I build an on-device resume tool, Rezumate, mentioned for context.)*

---

### Post 6B: r/PlacementsPrep

**Title:** For anyone prepping for placements: your resume file carries more than the text on the page

**Body:**

Something worth knowing before you send your resume around to every company portal and referral group during placement season: the file itself isn't just the text you see when you open it.

If your resume is a DOCX, it's actually a zip file. Rename one to `.zip` and you can open it, `docProps/core.xml` inside routinely stores the original document author's name, and sometimes a leftover "company" field if you built your resume by editing a template or a senior's old resume. PDFs carry similar hidden metadata (creation app, author, timestamps). Usually harmless, but worth a check, especially if you've been passing the same file around a WhatsApp group and editing it repeatedly.

The bigger thing: a lot of "free resume score" websites exist mainly to collect resumes as leads for a paid resume-writing service, not purely to help you. Before uploading anywhere, check whether the site actually says what happens to your file after scoring, most don't say anything at all, which is itself the answer.

Wrote up more on this, including a simple way to test any tool's privacy claim yourself: https://rezumate.app/blog/what-your-resume-file-reveals

*(I built an on-device resume/ATS tool called Rezumate for iPhone, mentioned for context, not the point of this post.)*

---

## Posting notes

- **Space it out hard.** This is now ~20 subs total across six groups. Posting even a third of these on the same day, with the same two links, is the profile Reddit's spam filter is specifically built to catch, independent of how different the wording is. Aim for no more than 1-2 posts per day, and never two from the same group back to back.
- Many of these subs overlap heavily in membership (r/AppDevelopers, r/iosdev, r/iosapps, r/IndieDev, r/AppBuilding especially, and r/SaaS, r/Solopreneur, r/startupsavant, r/AppBusiness). Don't post all of Group 3 or Group 4 to every sub in the group, pick 2-3 that best fit each post's specific angle and skip the rest, or the same readers will see near-duplicate posts within days.
- Read each sub's current self-promotion rule immediately before posting, not when this doc was written. Rules on r/resumes, r/cscareerquestions, r/SaaS, and r/IndieDev in particular tighten and loosen over time, and a post that was fine last month can get auto-removed now.
- Groups 1-4 stay soft: blog link is the CTA, app is a disclosed one-liner. Groups 5-6 flip that: Group 5 is a direct, full pitch because self-promo is the norm there; Group 6 stays soft like Groups 1-2, it's a job-seeker/student sub, not a launch sub.
- Reply to real comments with real answers matching the group's angle (technical detail in Groups 1/3, business/architecture reasoning in Group 4, product/feedback in Group 5, privacy/job-search detail in Groups 2/6). That's what keeps a post alive in the algorithm and what makes the disclosure land as honest rather than as a drive-by ad.
- If a mod removes a post for self-promo despite the disclosure, don't re-post it elsewhere immediately. Ask what the sub actually wants (usually: no link at all, or an approved "self-promo Saturday" thread) and follow that instead of working around it.
