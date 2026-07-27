import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../../components/SiteChrome";
import { APP_STORE_URL } from "../../../lib/app-store";

export const metadata: Metadata = {
  title: "What's actually inside your resume file (and where it goes when you upload it)",
  description:
    "A look at the metadata hiding inside a normal PDF or DOCX, and what happens on the other end of a free online resume checker.",
  alternates: {
    canonical: "/blog/what-your-resume-file-reveals"
  }
};

export default function WhatYourResumeFileRevealsPost() {
  return (
    <SiteChrome>
      <main className="shell blog-post">
        <Link href="/blog" className="legal-back">← Back to blog</Link>
        <p className="legal-meta">July 27, 2026 · 7 min read</p>
        <h1>What's actually inside your resume file (and where it goes when you &quot;upload for a free ATS check&quot;)</h1>

        <div className="blog-post-body">
          <p>
            Somewhere in your job search, someone told you to run your resume through an &quot;ATS checker.&quot;
            You found a free one, uploaded your PDF, and got a score. Fair trade, right? Before you do that again,
            it's worth actually looking at what's inside that file — because it's more than the text you see when
            you open it.
          </p>

          <h2>Your resume file is not just text</h2>
          <p>
            A resume is either a PDF or a DOCX, and both formats carry more than the words on the page.
          </p>
          <p>
            A DOCX file is a zip archive. If you rename one to <code>.zip</code> and open it, you'll find a folder
            of XML files, including <code>docProps/core.xml</code>, which routinely stores the document author's
            name, the company the template was created under, and a revision/edit count. If you built your resume
            by copying an old one from a previous job and editing it, that metadata sometimes rides along —
            occasionally including a previous employer's name in the &quot;company&quot; field, left over from a
            template.
          </p>
          <p>
            A PDF has its own metadata block (the <code>/Info</code> dictionary, or newer XMP metadata) that can
            store the creating application, author, and creation/modification timestamps. It's usually harmless —
            but it's also usually never scrubbed, because most people don't know it's there.
          </p>

          <h2>Where the file actually goes when you &quot;check your ATS score&quot;</h2>
          <p>
            Here's the part that matters more: when you upload that file to a free resume checker, the file leaves
            your device, travels to a server, and gets stored somewhere, at least temporarily, so it can be parsed
            and scored. That's true even for well-intentioned tools. A few questions worth asking before you upload
            anywhere:
          </p>
          <ul>
            <li>Is this resume stored after the score is generated, or deleted immediately?</li>
            <li>Is my contact information (name, phone, email, address) used for anything beyond scoring?</li>
            <li>Does the privacy policy actually say, in plain language, what happens to the file?</li>
            <li>Is the &quot;free&quot; score a lead magnet for a recruiting or resume-writing upsell?</li>
          </ul>
          <p>
            Many free ATS checkers are, structurally, lead-generation funnels. That's not necessarily malicious —
            it's just the business model — but it means your resume, with your full career history and contact
            details, is the product being processed to generate a lead, not just a document being scored.
          </p>

          <h2>What &quot;processed locally&quot; actually means, technically</h2>
          <p>
            The alternative is parsing and scoring the file entirely on-device — no upload step at all. Concretely,
            that means: the app reads the text layer straight out of the PDF or DOCX using local system libraries,
            runs keyword extraction and scoring in-process, and never opens a network connection to send the file or
            its extracted text anywhere. There's no server log of your resume because there's no server in that
            path. If you turn off Wi-Fi and cellular data, the analysis still works, because it never needed the
            network to begin with — a decent practical test if you want to check any tool's claim, not just ours.
          </p>

          <h2>What to actually do with this</h2>
          <p>
            You don't need to panic-scrub metadata from every resume you send. But it's reasonable to:
          </p>
          <ul>
            <li>Save your resume as a fresh export from a template, rather than editing a decade-old file in place.</li>
            <li>Read the privacy policy of any &quot;free checker&quot; before uploading, specifically the retention section.</li>
            <li>Prefer tools that explicitly process on-device, or that you can test with the network off.</li>
            <li>Treat your resume with the same caution you'd treat a document that lists your full address and phone number — because it is one.</li>
          </ul>

          <p>
            I built Rezumate around this exact idea: it does resume parsing, ATS-style scoring, keyword matching,
            and bullet rewriting entirely on your iPhone, without uploading the file anywhere.
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
