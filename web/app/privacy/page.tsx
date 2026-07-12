import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";

export default function PrivacyPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated: July 5, 2026</p>
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
