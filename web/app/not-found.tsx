import Link from "next/link";

import { SiteChrome } from "./components/SiteChrome";
import { WaitlistForm } from "./components/WaitlistForm";
import { WAITLIST_CUTOFF_LABEL } from "../lib/waitlist-config";

export default function NotFound() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Page not found</h1>
        <p className="legal-meta">This page doesn&rsquo;t exist</p>
        <div className="legal-card">
          <p>
            The page you&rsquo;re looking for was moved or never existed. While you&rsquo;re here, join the
            waitlist by {WAITLIST_CUTOFF_LABEL} to get notified when Rezumate launches on the App Store and lock in the $7.99 launch price.
          </p>
          <WaitlistForm source="404" />
        </div>
      </main>
    </SiteChrome>
  );
}
