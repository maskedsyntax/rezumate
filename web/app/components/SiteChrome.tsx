import Link from "next/link";
import type { ReactNode } from "react";

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
          <a href="/#features">Features</a>
          <a href="/#faq">FAQ</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
        </nav>
      </header>

      {children}

      <footer className="shell footer">
        <span>© {new Date().getFullYear()} Rezumate</span>
        <span>
          <Link href="/faq">FAQ</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/support">Support</Link>
        </span>
      </footer>
    </>
  );
}
