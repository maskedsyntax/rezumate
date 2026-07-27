import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../../components/SiteChrome";
import { APP_STORE_URL } from "../../../lib/app-store";

export const metadata: Metadata = {
  title: "Why I built resume scoring to run entirely on-device, with no backend",
  description:
    "Notes from building an ATS-style scoring engine, keyword matcher, and bullet rewriter that never make a network call.",
  alternates: {
    canonical: "/blog/on-device-resume-scoring"
  }
};

export default function OnDeviceResumeScoringPost() {
  return (
    <SiteChrome>
      <main className="shell blog-post">
        <Link href="/blog" className="legal-back">← Back to blog</Link>
        <p className="legal-meta">July 27, 2026 · 8 min read</p>
        <h1>Why I built resume scoring to run entirely on-device, with no backend</h1>

        <div className="blog-post-body">
          <p>
            When I started building a resume-to-job-description matching tool, the default architecture was obvious:
            a client uploads a resume, a server parses it, a model scores it against a job description, and the
            client polls for results. That's how basically every &quot;ATS checker&quot; on the internet works
            today. I built it, tested it, and then threw it away and rebuilt the entire scoring pipeline to run
            locally on the phone, with zero network calls. Here's why, and what that actually took.
          </p>

          <h2>The problem with the obvious architecture</h2>
          <p>
            A resume is one of the most identity-dense documents a person owns: full name, phone number, email,
            address history, employer names, dates of employment, sometimes salary context buried in bullet points.
            The moment you build a &quot;upload your resume, get a score&quot; product, you've also built a resume
            collection pipeline, whether you meant to or not. You now need a data retention policy, a breach
            response plan, and an answer to &quot;how long do you keep this and who can see it&quot; — for a feature
            that is, at its core, string matching and light NLP.
          </p>
          <p>
            That mismatch bothered me more than the infra cost did. So the constraint I set was: parsing, scoring,
            keyword extraction, rewriting, history, and PDF export all had to happen without the resume or the job
            description ever leaving the device.
          </p>

          <h2>Parsing without a server</h2>
          <p>
            Most resumes arrive as PDF or DOCX. Both formats have selectable text layers you can extract without any
            external service — <code>PDFKit</code> on iOS gets you most of the way for text-based PDFs, and DOCX is
            just a zip archive of XML (<code>word/document.xml</code>) you can walk directly. The harder edge case is
            scanned or image-based resumes, where there's no text layer at all. Rather than bolt on OCR and inflate
            the app just to handle a minority case, I made a deliberate tradeoff: Rezumate asks for a text-based
            resume and tells the user clearly when it can't extract usable text, instead of quietly producing a
            garbage score.
          </p>

          <h2>Scoring without calling out to an LLM API</h2>
          <p>
            The scoring engine breaks into four components, each independently computable on-device:
          </p>
          <ul>
            <li>
              <strong>Keyword coverage</strong> — extract candidate skills, tools, and role terms from the job
              description, normalize casing and stemming, then diff against terms found in the resume.
            </li>
            <li>
              <strong>Impact quality</strong> — pattern-match bullets against weak-verb and passive-construction
              signals (&quot;responsible for,&quot; &quot;helped with&quot;) versus outcome-oriented phrasing.
            </li>
            <li>
              <strong>Structure and readability</strong> — section presence, bullet length distribution, and
              formatting consistency.
            </li>
            <li>
              <strong>Formatting risk</strong> — table-heavy layouts, embedded images over text, multi-column
              structures — patterns that are known to break real-world ATS parsers.
            </li>
          </ul>
          <p>
            None of this requires a large model or a network round trip. It's closer to a well-tuned rules engine
            with weighted scoring than to a chatbot — which turned out to be a feature, not a limitation. It's fast,
            it's deterministic, and it's auditable: I can tell you exactly why a resume scored 62 instead of 87,
            because the score is a sum of inspectable parts, not a black box.
          </p>

          <h2>Rewriting bullets without inventing facts</h2>
          <p>
            The trickiest constraint wasn't technical, it was ethical. A resume &quot;improvement&quot; feature is
            one bad prompt away from fabricating a metric the user never achieved. I explicitly designed the
            rewrite flow to only ever: strengthen the verb, tighten the phrasing, and surface missing job-description
            keywords that genuinely apply — never to insert a percentage, a dollar figure, or an outcome that wasn't
            already implied by the original bullet. If the user didn't say it, the app doesn't say it for them.
          </p>

          <h2>The PDF export pipeline</h2>
          <p>
            Even export stayed local. The final resume is rendered as a LaTeX-style, ATS-safe PDF — centered header,
            clean section rules, tabular experience entries, fully selectable text — generated directly on-device
            with no rendering service in between. That closes the loop: import, analyze, improve, export, all
            without a single byte of the resume touching a server I run.
          </p>

          <h2>What this cost me</h2>
          <p>
            Building this way is slower and less flexible than shipping a backend. I can't fix a scoring bug with a
            hotfix deploy — it goes through App Store review like everything else. I don't get server-side analytics
            on which resumes score poorly and why. Every scoring rule has to earn its place in the binary. But the
            tradeoff bought something I think matters more for this specific product: there is no database of
            people's resumes sitting on a server I have to defend, monitor, or eventually explain in a breach
            notice. For a document that is basically a condensed identity file, that felt like the right default,
            not an afterthought.
          </p>

          <p>
            I turned this into a full app called Rezumate — it does the ATS scoring, keyword matching, and bullet
            rewriting described above, entirely on iPhone.
          </p>
        </div>

        <div className="blog-cta">
          <p>Rezumate: private, on-device ATS resume scoring for iPhone. No account, no cloud upload.</p>
          <a className="button" href={APP_STORE_URL}>View on the App Store</a>
        </div>
      </main>
    </SiteChrome>
  );
}
