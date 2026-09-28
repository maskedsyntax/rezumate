import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Rezumate handles resume and job-description data in the browser checker and the iPhone app.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated: September 29, 2026</p>
        <div className="legal-card">
          <p>
            <strong>Rezumate is built with a 100% on-device privacy model.</strong> Your resume contains sensitive personal information (such as your phone number, email address, physical address, and full work history). We believe this data should never leave your control.
          </p>
          <p>
            Unlike traditional resume builders or cloud services, <strong>Rezumate does not upload your files, parsed resume text, or pasted job descriptions to a resume analysis server.</strong> Text parsing, keyword extraction, ATS-style scoring, and writing suggestions are processed locally on your iPhone.
          </p>
          <p>
            <strong>Local Data Storage:</strong> All information, including your resume history, scores, missing keywords, and tailored draft variants, is saved locally on your device in app sandboxed storage. We have no resume-analysis database, run no user tracking analytics, and have zero visibility into your career details.
          </p>
          <p>
            <strong>Local Suggestions:</strong> Bullet point suggestions are generated locally using scoring rules and writing patterns. The first release does not require a separate model download.
          </p>
          <p>
            <strong>Website resume checker:</strong> The free checker reads your PDF or DOCX and compares it with a job description in your browser. The resume text, job description, and result stay in that browser tab and are cleared when you refresh or close it. They are not sent to a Rezumate analysis server. The site may still receive ordinary web requests for the page, fonts, scripts, and assets.
          </p>
          <p>
            <strong>Accounts & Sign-Ins:</strong> No account signup is required. You can use the app immediately without creating an account.
          </p>
          <p>
            If you have questions about the app's local operations, or need support, email aftaab@aftaab.dev.
          </p>
        </div>
      </main>
    </SiteChrome>
  );
}
