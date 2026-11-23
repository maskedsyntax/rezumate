import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "@/app/components/SiteChrome";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Rezumate, including Rezumate Pro subscriptions and AI features.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Terms of Service</h1>
        <p className="legal-meta">Last updated: November 23, 2026</p>
        <div className="legal-card">
          <p>
            Rezumate provides resume parsing, job-description matching, ATS-style scoring, writing suggestions, optional AI writing features, and PDF export. It is informational only and does not guarantee interviews, job offers, ATS outcomes, recruiter decisions, or hiring results.
          </p>
          <p>
            You are responsible for keeping your resume accurate and truthful. Review every suggestion, including AI-written text, before you use it. Do not use Rezumate to invent employers, credentials, skills, metrics, or experience.
          </p>
          <p>
            <strong>Rezumate Pro subscriptions:</strong> Rezumate Pro is available as a monthly or yearly auto-renewing subscription. Payment is charged to your Apple ID when you confirm the purchase. The subscription renews automatically at the same price unless you turn off auto-renew at least 24 hours before the end of the current period. You can manage or cancel it in Settings › Apple ID › Subscriptions. Cancelling stops the next renewal; Pro stays active until the end of the period you paid for. Refunds are handled by Apple.
          </p>
          <p>
            <strong>Fair use of AI:</strong> Pro includes up to 150 AI actions a month to keep the service available for everyone. Free users get a small number of AI actions to try it. AI features need an internet connection and may occasionally be unavailable.
          </p>
          <p>
            <strong>Earlier Lifetime purchases:</strong> If you bought the one-time Lifetime Pro unlock, you keep everything it included, plus 25 AI actions. Ongoing AI use needs a subscription.
          </p>
          <p>
            Your resumes and saved variants are stored on your device, so keep your own backups. These terms apply together with Apple's Licensed Application End User License Agreement (https://www.apple.com/legal/internet-services/itunes/dev/stdeula/).
          </p>
          <p>
            Questions or support: email aftaab@aftaab.dev.
          </p>
        </div>
      </main>
    </SiteChrome>
  );
}
