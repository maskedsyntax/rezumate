import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";

export default function TermsPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Terms of Service</h1>
        <p className="legal-meta">Last updated: July 5, 2026</p>
        <div className="legal-card">
          <p>
            Rezumate provides local resume parsing, job-description matching, ATS-style scoring, local PDF exports, and local writing suggestions. The app is strictly informational and does not guarantee interviews, job offers, ATS outcomes, recruiter decisions, or hiring results.
          </p>
          <p>
            Users are solely responsible for ensuring their resumes remain accurate and truthful. Rezumate’s local suggestions should not be used to invent employers, credentials, skills, metrics, or experience.
          </p>
          <p>
            Since all parsing and optimization run locally on your device, you are responsible for maintaining your device's security and local data backups.
          </p>
          <p>
            For support or questions regarding the app's local operations, contact aftaab@aftaab.dev.
          </p>
        </div>
      </main>
    </SiteChrome>
  );
}
