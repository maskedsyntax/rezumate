import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "@/app/components/SiteChrome";
import { APP_STORE_URL } from "@/lib/app-store";

export const metadata: Metadata = {
  title: "Free Resume Builder with Job Match Score | No Sign-Up",
  description: "Build an ATS-friendly resume in your browser, tailor it to a job description with a live match score, and download a PDF. Free, no account, no watermark. Your resume stays on your device.",
  alternates: { canonical: "/resume-builder" },
  openGraph: { title: "Free Resume Builder | Rezumate", description: "Build, tailor, and export an ATS-friendly resume. Free, no sign-up, no watermark.", url: "/resume-builder" }
};

const steps = [
  ["Import or start fresh", "Drop in a PDF or DOCX and Rezumate sorts it into sections, or start from a clean structure."],
  ["Edit with guidance", "Every bullet gets quick checks: weak opening, no result, too long. Fix a weak verb in one tap."],
  ["Tailor to the job", "Paste the job description to see a live match score, missing skills, and what to strengthen."],
  ["Download the PDF", "Pick a template and export real, selectable text an ATS reads cleanly. No watermark."]
];

const faqs = [
  ["Is it really free?", "Yes. Building, tailoring with the match score, and downloading a PDF are free, with no watermark and no account."],
  ["Where is my resume stored?", "In your browser, on your device. Nothing is uploaded to Rezumate. That also means clearing your browser data removes it, so download a backup from your dashboard now and then."],
  ["Will an ATS read my resume?", "Every template is one column of real text with standard headings, and each is tested by reading the exported PDF back the way a parser does. No builder can promise how a specific employer's system behaves, but this avoids the common failures: tables, columns, text in images, and letter-spaced headings."],
  ["Can I use it on my phone?", "The checker and preview work on any phone, but editing a full resume is easiest on a computer. On iPhone, the Rezumate app is built for small screens."]
];

export default function ResumeBuilderPage() {
  return (
    <SiteChrome>
      <main>
        <section className="shell builder-hero">
          <div>
            <p className="eyebrow">Free resume builder</p>
            <h1>Build it once. Tailor it for every job.</h1>
            <p className="lead">A structured resume editor with a live job-match score, ATS-safe templates, and a clean PDF at the end. No sign-up, no watermark, and your resume stays on your device.</p>
            <div className="actions">
              <Link className="button button-shine" href="/app">Start building free</Link>
              <Link className="button secondary" href="/templates">See the templates</Link>
            </div>
            <div className="seo-hero-points"><span>No account</span><span>No watermark</span><span>Stays on your device</span></div>
          </div>
          <div className="paper-stack" aria-hidden="true">
            <img src="/templates/executive.png" alt="" width={900} height={1164} />
            <img src="/templates/classic.png" alt="" width={900} height={1164} />
            <img src="/templates/modern.png" alt="" width={900} height={1164} />
            <span className="paper-stamp">ATS-safe<br />✦<br />Free PDF</span>
          </div>
        </section>

        <section className="band seo-content-band">
          <div className="shell">
            <p className="eyebrow">How it works</p>
            <h2>From the resume you have to the one the job wants.</h2>
            <div className="builder-steps">
              {steps.map(([title, body], index) => (
                <div className="builder-step" key={title}>
                  <b>0{index + 1}</b>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band seo-content-band">
          <div className="shell seo-content-grid">
            <div>
              <p className="eyebrow">Why Rezumate</p>
              <h2>Honest about what it changes.</h2>
              <p>Most resume builders let you type for an hour, then ask for a card before you can download. Rezumate gives you the PDF free, and it never pads your resume with skills you don&apos;t have. Missing keywords stay suggestions until you confirm them.</p>
              <p>The match score uses the same rules as the <a href={APP_STORE_URL}>Rezumate iPhone app</a> and the <Link href="/resume-checker">free resume checker</Link>: keyword coverage 45%, impact 25%, structure 20%, and formatting 10%.</p>
            </div>
            <div className="seo-content-card">
              <h3>In the free builder</h3>
              <ul>
                <li>Import from PDF, DOCX, or pasted text</li>
                <li>Reorder, rename, and hide sections</li>
                <li>Bullet checks and one-tap stronger openings</li>
                <li>Live job match score with missing skills</li>
                <li>Four ATS-friendly templates, Letter or A4</li>
                <li>Unlimited PDF downloads and backups</li>
              </ul>
              <Link className="button" href="/app">Open the builder</Link>
            </div>
          </div>
        </section>

        <section className="band seo-faq-band">
          <div className="shell seo-faq-grid">
            <div><p className="eyebrow">Common questions</p><h2>Before you start.</h2></div>
            <div>
              {faqs.map(([q, a]) => (
                <div key={q}>
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
