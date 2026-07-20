import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";
import { WaitlistForm } from "../components/WaitlistForm";
import { WAITLIST_CUTOFF_LABEL } from "../../lib/waitlist-config";

export default function WaitlistPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Join the Waitlist</h1>
        <p className="legal-meta">Native iOS app, coming to the App Store</p>
        <div className="legal-card">
          <p>
            Rezumate is being prepared for its first App Store release. Join the waitlist by {WAITLIST_CUTOFF_LABEL} to
            get notified the moment it&rsquo;s live, and lock in the $7.99 launch price before it becomes $14.99.
          </p>
          <WaitlistForm source="waitlist_page" />
        </div>
      </main>
    </SiteChrome>
  );
}
