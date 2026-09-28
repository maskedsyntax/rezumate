import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Rezumate resume analysis, file imports, scoring, and PDF exports.",
  alternates: { canonical: "/support" }
};

export default function SupportPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Support</h1>
        <p className="legal-meta">Help with Rezumate and your resume workflow</p>
        <div className="legal-card">
          <p>
            Need help with Rezumate, resume analysis, exports, or local data? Email us and we will
            get back to you as soon as possible.
          </p>
          <a className="legal-email" href="mailto:aftaab@aftaab.dev">Email Support</a>
          <h2>Common Topics</h2>
          <ul>
            <li>Use a text-based PDF or DOCX when uploads fail. Scanned image-only files may not extract cleanly.</li>
            <li>Paste a complete job description for better keyword matching.</li>
            <li>Review writing suggestions carefully and keep your resume factual.</li>
            <li>Exports are generated from the tailored resume text saved in your analysis history.</li>
          </ul>
        </div>
      </main>
    </SiteChrome>
  );
}
