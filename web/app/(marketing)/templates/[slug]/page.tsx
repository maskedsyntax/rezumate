import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteChrome } from "@/app/components/SiteChrome";
import { templates } from "@/lib/pdf/templates";
import { atsFacts, templateCopy } from "../template-copy";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return templates.map((template) => ({ slug: template.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const template = templates.find((t) => t.id === slug);
  if (!template) return {};
  const copy = templateCopy[slug];
  return {
    title: `${copy.title} (Free, ATS-Friendly)`,
    description: `${template.description} Free to edit in your browser and download as a PDF with no watermark.`,
    alternates: { canonical: `/templates/${slug}` },
    openGraph: { title: `${copy.title} | Rezumate`, url: `/templates/${slug}`, images: [{ url: `/templates/${slug}.png`, width: 900, height: 1164, alt: `${template.name} resume template` }] }
  };
}

export default async function TemplatePage({ params }: Params) {
  const { slug } = await params;
  const template = templates.find((t) => t.id === slug);
  if (!template) notFound();
  const copy = templateCopy[slug];
  const others = templates.filter((t) => t.id !== slug);

  return (
    <SiteChrome>
      <main>
        <section className="shell tpl-detail">
          <a className="tpl-paper" href={`/templates/${slug}.pdf`} aria-label={`Open the ${template.name} sample PDF`}>
            <img src={`/templates/${slug}.png`} alt={`${template.name} resume template filled in with a sample resume`} width={900} height={1164} />
          </a>
          <div>
            <p className="eyebrow">Template · {template.name}</p>
            <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)" }}>{copy.title}</h1>
            <p className="lead">{copy.about}</p>
            <div className="actions" style={{ marginTop: 24 }}>
              <Link className="button button-shine" href={`/app/new?template=${slug}`}>Use this template free</Link>
              <a className="button secondary" href={`/templates/${slug}.pdf`}>Open the sample PDF</a>
            </div>
            <h2 style={{ fontSize: 16, marginTop: 36 }}>Good for</h2>
            <ul className="tpl-facts">{copy.bestFor.map((item) => <li key={item}>{item}</li>)}</ul>
            <h2 style={{ fontSize: 16 }}>Built to be read by an ATS</h2>
            <ul className="tpl-facts">{atsFacts.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="muted" style={{ fontSize: 14 }}>Try it yourself: open the sample PDF and select the text. Everything you see is real text, in reading order.</p>
          </div>
        </section>

        <section className="band seo-faq-band">
          <div className="shell">
            <p className="eyebrow">Other templates</p>
            <div className="tpl-grid">
              {others.map((other) => (
                <article className="tpl-card" key={other.id}>
                  <Link className="tpl-paper" href={`/templates/${other.id}`}>
                    <img src={`/templates/${other.id}.png`} alt={`${other.name} resume template`} width={900} height={1164} loading="lazy" />
                  </Link>
                  <h3>{other.name}</h3>
                  <p>{other.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
