import Link from "next/link";
import type { ReactNode } from "react";

import { APP_STORE_URL } from "../../lib/app-store";
import { ScrollTopButton } from "./ScrollTopButton";

type Props = {
  children: ReactNode;
};

export function SiteChrome({ children }: Props) {
  return (
    <>
      <aside className="launch-banner" aria-label="Rezumate release announcement">
        <div className="shell launch-banner-inner">
          <span className="launch-status">Now live</span>
          <strong>The wait is over. Rezumate is now available on the App Store.</strong>
          <a href={APP_STORE_URL}>Download now <span aria-hidden="true">→</span></a>
        </div>
      </aside>
      <header className="shell nav">
        <Link href="/" className="brand">
          <img src="/rezumate-logo.svg" alt="" className="brand-logo" />
          Rezumate
        </Link>
        <nav className="navlinks">
          <a href="/#how-it-works">How it works</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
          <a className="nav-cta" href={APP_STORE_URL}>Get the App</a>
        </nav>
      </header>

      {children}

      <footer className="shell footer">
        <span>© {new Date().getFullYear()} Rezumate</span>
        <span>
          <Link href="/faq">FAQ</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/support">Support</Link>
        </span>
      </footer>

      <ScrollTopButton />
    </>
  );
}
