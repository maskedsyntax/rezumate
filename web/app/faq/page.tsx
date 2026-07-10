import Link from "next/link";

import { FaqList } from "../components/FaqList";
import { faqSections } from "../components/faq-data";
import { SiteChrome } from "../components/SiteChrome";

export default function FaqPage() {
  return (
    <SiteChrome>
      <main className="shell faq-page">
        <Link href="/" className="legal-back">← Back</Link>
        <p className="eyebrow">FAQ</p>
        <h1>Frequently asked questions</h1>
        <p className="lead faq-lead">
          Everything you need to know about Rezumate, including the workflow, analysis, local suggestions, plans,
          privacy, and launch timeline.
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
