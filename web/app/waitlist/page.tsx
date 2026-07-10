import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";

export default function WaitlistPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Join the Waitlist</h1>
        <p className="legal-meta">Native iOS app, coming to the App Store</p>
        <div className="legal-card">
          <p>
            The native iOS app is being prepared for release. Until the App Store link is live, send a note to
            aftaab@aftaab.dev with the subject &ldquo;Waitlist&rdquo; and we will notify you when Rezumate is available.
          </p>
          <a className="legal-email" href="mailto:aftaab@aftaab.dev?subject=Waitlist">Join Waitlist</a>
        </div>
      </main>
    </SiteChrome>
  );
}
