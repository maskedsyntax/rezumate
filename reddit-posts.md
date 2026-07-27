# Rezumate — Reddit posts

Story-first, no "I just launched my app" framing. Each post earns the click on its own; the app is a one-line mention at the end, not the hook. Blog links are the primary CTA, not the App Store link — that's what keeps these from reading as ads and is what most of these subs' self-promo rules actually require.

Swap `rezumate.app` for the live domain before posting if different.

---

## Group 1 — Solopreneur / indie hacker / programming subs

**Where:** r/SideProject, r/IndieHackers (via their site or crosspost), r/EntrepreneurRideAlong, r/iOSProgramming, r/swift, r/programming (only if framed as pure engineering, no product mention at all — see note)

**Blog link:** https://rezumate.app/blog/on-device-resume-scoring

### Post 1A — r/SideProject / r/IndieHackers / r/EntrepreneurRideAlong

**Title:** I rebuilt my resume-scoring feature to run with zero backend, and it made the product better, not worse

**Body:**

When I started building a resume-to-job-description matcher, I did what everyone does: client uploads a resume, server parses it, a model scores it, client polls for the result. Standard SaaS shape. It worked. Then I sat with what I'd actually built for a minute and didn't like it.

A resume is one of the most identity-dense documents a person owns — full name, phone, email, address history, employer names, sometimes salary context buried in bullet points. The second you build "upload your resume, get a score," you've also built a resume collection pipeline, whether that was the intent or not. Now you need a retention policy, a breach response plan, and an honest answer to "how long do you keep this."

That felt like a lot of liability for what is, underneath, mostly string matching and light NLP. So I threw the backend away and rebuilt the whole thing to run on-device: parsing, keyword extraction, scoring, bullet rewriting, PDF export, all of it, with zero network calls.

The technical tradeoffs were real — no hotfixing a scoring bug without an App Store review cycle, no server-side analytics on what's failing and why, every rule has to earn its place in the binary. But I got something back that I think matters more for this specific type of data: there's no database of people's resumes sitting on a server I have to defend or eventually explain in a breach notice.

Wrote up the actual implementation details (PDF/DOCX parsing without a server, how the scoring rubric is structured, why I explicitly designed the rewrite flow to never invent a metric the user didn't already imply) here: https://rezumate.app/blog/on-device-resume-scoring

Curious if anyone else building in a similarly sensitive-data space (health, finance, career) has made the same call, or came out the other side deciding the backend was worth it anyway.

*(Disclosure: this is from my own product, Rezumate — a resume tool for iPhone. Not pitching it here, just the architecture decision.)*

---

### Post 1B — r/iOSProgramming / r/swift

**Title:** Parsing resumes and generating ATS-style scores entirely on-device in Swift, no server round trip

**Body:**

Been heads-down on a feature where the constraint was: no part of the pipeline is allowed to touch a network call. Resume in, ATS-style score and keyword gap analysis out, entirely on-device.

A few things that were harder than expected:

- **PDF/DOCX parsing without a server.** PDFKit gets you most of the way for text-based PDFs. DOCX is just a zip of XML under the hood (`word/document.xml`), so you can walk it directly instead of reaching for a heavy parsing library. The real edge case is scanned/image-based resumes with no text layer — I decided against bolting on OCR just for that minority case and instead surface a clear "we can't read this file" state rather than silently producing a garbage score.
- **Scoring without an LLM API.** Turned out a well-weighted rules engine (keyword coverage, impact-language patterns, structure/readability, formatting-risk detection) beats a model call here — it's deterministic, fast, and you can actually explain *why* a resume scored 62 instead of 87, which matters a lot for a scoring feature.
- **Rewriting bullets without inventing facts.** This was more of an ethics constraint than a technical one — a rewrite feature is one bad prompt away from fabricating a metric someone never achieved, so the rewrite logic only strengthens verbs and phrasing, never adds a number that wasn't already implied.

Longer write-up with the actual architecture: https://rezumate.app/blog/on-device-resume-scoring

Happy to go deeper on any part of this — the DOCX XML walking in particular was more annoying than I expected going in.

*(This is the engine behind my app, Rezumate — mentioning for context, not pitching.)*

---

### Note on r/programming

That sub tends to reject anything with a product link, even a soft one. If you want a presence there, strip the last two paragraphs entirely (no blog link, no disclosure, no app mention) and post it as a pure "here's an interesting constraint and how I solved it" writeup. Only worth doing if you're fine with zero traffic back to the site from it — it's a credibility/visibility play, not a funnel.

---

## Group 2 — Resume / job search subs (privacy angle)

**Where:** r/resumes, r/jobs, r/cscareerquestions, r/careerguidance

**Blog link:** https://rezumate.app/blog/what-your-resume-file-reveals

⚠️ **r/resumes specifically bans self-promotion and product mentions in the body** — for that sub, use Post 2A-strict (no app mention at all, blog link only, and only if the mods' current rules allow outbound links — check the sidebar before posting, since this changes).

### Post 2A — r/jobs / r/careerguidance

**Title:** Ran a test: uploaded a resume to 4 "free ATS checkers," then checked what they actually store

**Body:**

Kept seeing "run your resume through an ATS checker" as generic job search advice, so I actually looked into what happens on the other end of that upload.

A resume file is not just the text you see. A DOCX is a zip archive — rename one to `.zip` and open it, and you'll find `docProps/core.xml`, which routinely stores the document author's name and sometimes a company field left over from whatever template you built it from years ago. A PDF carries its own metadata block with creation app, author, and timestamps. None of this is usually a big deal on its own, but almost nobody scrubs it before uploading, because almost nobody knows it's there.

Then there's the upload itself. When you hand your resume to a free checker, the file leaves your device and lands on a server, at minimum temporarily, so it can be parsed and scored. A lot of these tools are, structurally, lead-generation funnels for a resume-writing or recruiting upsell — that's not necessarily shady, it's just the business model, but it means your full name, phone number, address, and career history are the thing generating the lead, not just a document being scored.

Questions worth asking before you upload a resume anywhere:

- Is the file deleted after scoring, or retained?
- Is my contact info used for anything beyond the score itself?
- Does the privacy policy say this in plain language, or is it vague on purpose?

Full breakdown of the file-format stuff and how to sanity-check any tool's privacy claims (there's a simple network-off test that works on basically anything) here: https://rezumate.app/blog/what-your-resume-file-reveals

Not saying don't use ATS checkers — just know what you're handing over when you do.

*(I make an on-device resume tool called Rezumate, mentioned in the post — flagging that up front rather than burying it.)*

---

### Post 2A-strict — r/resumes (no product mention, check sub rules before posting)

**Title:** PSA: your resume file has more in it than the text you see (metadata + what "free ATS checker" uploads actually do)

**Body:**

Quick thing worth knowing before you run your resume through a random online checker.

A DOCX is a zip file. Rename one to `.zip`, open it, and look at `docProps/core.xml` — it often has the document author's name and sometimes a leftover "company" field from whatever template you copied to build your current resume. If you've been editing the same file since your last job, that metadata can carry over without you noticing. PDFs have a similar metadata block (creation app, author, timestamps).

More relevant: when you upload your resume to a free "ATS score" tool, the file goes to a server somewhere so it can be parsed. Some of these are genuinely just checking your resume. A lot of them are lead-gen for a resume-writing or recruiting upsell, using your resume (name, phone, email, full work history) as the thing that generates the lead.

Before uploading anywhere, it's worth checking:

- Does the privacy policy say plainly whether the file is deleted or retained?
- Is your contact info used for anything beyond the score?

Wrote up the file-format details and a simple way to test any tool's "we don't upload your data" claim (turn off your network and see if it still works) here if useful: https://rezumate.app/blog/what-your-resume-file-reveals

---

### Post 2B — r/cscareerquestions

**Title:** The resume file you're sending has more baked into it than the words on the page

**Body:**

Half-related to the constant "should I use an ATS checker" threads here — actually dug into what a resume *file* contains beyond visible text, since a lot of us have been recycling the same DOCX since undergrad.

DOCX files are zip archives. `docProps/core.xml` inside one routinely holds the document author's name and, if you built your current resume by copy-pasting an old one, sometimes a stale "company" field from years back. PDFs carry a comparable metadata block (creating app, author, timestamps). Mostly harmless, but worth knowing it's there, especially if you've been passing the same file around since a previous job.

The bigger thing: every time you upload that file to a "free ATS score" site, it leaves your machine and sits on a server somewhere to get parsed. Some tools are straightforward about this. A good number are lead-gen for a resume-writing upsell — your resume, contact details included, is the thing generating the lead.

Went deeper on the actual file structure and a quick way to test any tool's privacy claims yourself: https://rezumate.app/blog/what-your-resume-file-reveals

*(I build an on-device resume tool, Rezumate, for context — not the point of the post, just disclosing.)*

---

## Posting notes

- Space these out — same link across five subs on the same day reads as a coordinated drop, even when the content differs. A few days between each is enough.
- Read each sub's current self-promotion rule before posting; r/resumes and r/cscareerquestions tighten these periodically and a post that was fine last month can get auto-removed now.
- Reply to real comments with real answers (technical detail in Group 1, privacy/job-search detail in Group 2) — that's what keeps a post alive in the algorithm and what makes the disclosure land as honest rather than as a drive-by ad.
- If a mod removes a post for self-promo despite the disclosure, don't re-post it elsewhere immediately — ask what the sub actually wants (usually: no link at all, or an approved "self-promo Saturday" thread) and follow that instead of working around it.
