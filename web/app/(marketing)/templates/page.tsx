import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "@/app/components/SiteChrome";
import { templates } from "@/lib/pdf/templates";
import { atsFacts, templateCopy } from "./template-copy";

export const metadata: Metadata = {
  title: "Free ATS-Friendly Resume Templates",
  description: "Four free, ATS-friendly resume templates: Classic, Modern, Compact, and Executive. Single-column, real text, no watermark. Edit in your browser and download a PDF.",
  alternates: { canonical: "/templates" },
  openGraph: { title: "Free ATS-Friendly Resume Templates | Rezumate", description: "Single-column resume templates that ATS software reads cleanly. Edit free in your browser.", url: "/templates" }
};

export default function TemplatesPage() {
  return (
    <SiteChrome>
      <main>
        <section className="shell seo-hero">
          <p className="eyebrow">Resume templates</p>
          <h1>ATS-friendly templates that still look sharp.</h1>
          <p className="lead">Every Rezumate template is one column of real text with standard headings, so applicant tracking systems read it in the right order. Pick one, fill it in your browser, and download a PDF. Free, with no watermark.</p>
          <div className="seo-hero-points"><span>No account</span><span>No watermark</span><span>Switch templates anytime</span></div>

          <div className="tpl-grid">
            {templates.map((template) => (
              <article className="tpl-card" key={template.id}>
                <Link className="tpl-paper" href={`/templates/${template.id}`} aria-label={`${template.name} template details`}>
                  <img src={`/templates/${template.id}.png`} alt={`${template.name} resume template with a sample resume for Alex Rivera`} width={900} height={1164} loading="lazy" />
                </Link>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="actions">
                  <Link className="button" href={`/app/new?template=${template.id}`}>Use {template.name}</Link>
                  <Link className="button secondary" href={`/templates/${template.id}`}>Details</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="band seo-content-band">
          <div className="shell seo-content-grid">
            <div>
              <p className="eyebrow">Why these work</p>
              <h2>Designed for the software that reads resumes first.</h2>
              <p>Most applications pass through an applicant tracking system before a person sees them. ATS parsers read text top to bottom, so multi-column layouts, tables, and text inside images can come out scrambled or missing. Letter-spaced headings like “E X P E R I E N C E” can even hide a whole section.</p>
              <p>Rezumate templates avoid all of that, and every one is checked by reading the exported PDF back the way a parser does. They differ in typography and spacing, never in structure, so you can switch templates without rewriting anything.</p>
            </div>
            <div className="seo-content-card">
              <h3>Every template includes</h3>
              <ul>{atsFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
              <Link className="button" href="/app">Start building free</Link>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
