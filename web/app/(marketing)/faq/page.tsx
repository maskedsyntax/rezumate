import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/app/components/FaqList";
import { faqSections } from "@/app/components/faq-data";
import { SiteChrome } from "@/app/components/SiteChrome";

export const metadata: Metadata = {
  title: "FAQ: Resume Scoring, Privacy and Pricing",
  description: "Answers about Rezumate's ATS-style score, resume tailoring, AI rewrites, PDF export, privacy, free usage, and Rezumate Pro pricing.",
  alternates: { canonical: "/faq" }
};

export default function FaqPage() {
  return (
    <SiteChrome>
      <main className="shell faq-page">
        <Link href="/" className="legal-back">← Back</Link>
        <p className="eyebrow">FAQ</p>
        <h1>Frequently asked questions</h1>
        <p className="lead faq-lead">
          Everything you need to know about Rezumate, including the workflow, analysis, local suggestions, plans,
          privacy, pricing, and App Store availability.
        </p>
        <FaqList sections={faqSections} idPrefix="faq" />
        <div className="faq-cta">
          <p>Still have a question?</p>
          <div className="actions">
            <Link className="button" href="/support">Contact Support</Link>
            <Link className="button secondary" href="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </SiteChrome>
  );
}
