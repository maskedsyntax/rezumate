import Link from "next/link";

import { SiteChrome } from "./components/SiteChrome";
import { APP_STORE_URL } from "../lib/app-store";

export default function NotFound() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Page not found</h1>
        <p className="legal-meta">This page doesn&rsquo;t exist</p>
        <div className="legal-card">
          <p>
            The page you&rsquo;re looking for was moved or never existed. Rezumate is live on the App Store and ready to help
            tailor your next resume.
          </p>
          <a className="button" href={APP_STORE_URL}>Download on the App Store</a>
        </div>
      </main>
    </SiteChrome>
  );
}
