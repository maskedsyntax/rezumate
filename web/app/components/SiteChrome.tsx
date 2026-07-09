import Link from "next/link";
import type { ReactNode } from "react";

import { ScrollTopButton } from "./ScrollTopButton";

type Props = {
  children: ReactNode;
};

export function SiteChrome({ children }: Props) {
  return (
    <>
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
          <Link className="nav-cta" href="/waitlist">Claim $7.99</Link>
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
