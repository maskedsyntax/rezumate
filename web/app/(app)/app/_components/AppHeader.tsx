"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_STORE_URL } from "@/lib/app-store";

const links = [{ href: "/app", label: "Resumes" }];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-brand" aria-label="Rezumate home">
          <img src="/rezumate-logo.svg" alt="" />
          Rezumate <span className="app-brand-tag">Web</span>
        </Link>
        <nav className="app-nav" aria-label="App">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href || pathname.startsWith("/app/resumes") ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="app-header-end">
          <span className="app-local-badge" title="Resumes are stored in this browser's local storage.">Saved on this device</span>
          <a className="button small secondary" href={APP_STORE_URL}>iPhone app</a>
        </div>
      </div>
    </header>
  );
}
