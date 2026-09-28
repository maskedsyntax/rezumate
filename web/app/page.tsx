import Link from "next/link";

import { Fragment, type CSSProperties } from "react";

import { CostCalculator } from "./components/CostCalculator";
import { FaqList } from "./components/FaqList";
import { FeatureBento } from "./components/FeatureBento";
import { HeroDemo } from "./components/HeroDemo";
import { HowItWorks } from "./components/HowItWorks";
import { MobileCtaBar } from "./components/MobileCtaBar";
import { ProofStory } from "./components/ProofStory";
import { ResumeCheck } from "./components/ResumeCheck";
import { RevealHeading } from "./components/RevealHeading";
import { ScrollReveal } from "./components/ScrollReveal";
import { featuredFaqItems } from "./components/faq-data";
import { SiteChrome } from "./components/SiteChrome";
import { TapeMarquee } from "./components/TapeMarquee";
import { TestimonialMarquee } from "./components/TestimonialMarquee";
import { APP_STORE_URL } from "../lib/app-store";

const ctaHref = APP_STORE_URL;

const proofStats = [
  ["100% local", "Resume parsing, scoring, keyword checks, rewrites, history, and PDF export run on your iPhone."],
  ["Truthful improvements", "Weak wording is strengthened without adding skills, metrics, or achievements that are not already in your resume."],
  ["No account", "Open the app, upload a resume, paste a job description, and start tailoring."]
];

const guideSteps = [
  ["Upload a real resume", "Use a text-based PDF or DOCX. Scanned image resumes can fail because there is no selectable text to analyze."],
  ["Paste the full job description", "The better the JD, the better the keyword extraction. Include responsibilities, requirements, skills, and tools."],
  ["Check the four score areas", "Keyword coverage carries the most weight, then impact quality, structure/readability, and formatting risk."],
  ["Improve the resume", "Rezumate strengthens supported wording while keeping missing JD terms visible as recommendations."],
  ["Preview before sending", "Open the improved PDF, review every line, keep it truthful, then download and apply."]
];

const comparison = [
  ["Pricing", "$14.99 once", "$15-30 every month", "Often subscription or per-credit"],
  ["Privacy", "Runs locally on iPhone", "Uploads resume to servers", "Depends on vendor"],
  ["Workflow", "Upload, analyze, improve, export", "Usually long form builders", "Mostly formatting checks"],
  ["Output", "ATS-safe LaTeX-style PDF", "Template PDF", "Report only"]
];

const proFeatures = [
  "Unlimited ATS analyses",
  "Unlimited resume improvements",
  "Unlimited saved variants",
  "Full score diagnosis",
  "Complete missing keyword insights",
  "Professional on-device PDF export",
  "No subscription, no credit packs, no account requirement"
];

const heroWords: [string, boolean][] = [
  ["Tailor", false],
  ["every", true],
  ["resume", true],
  ["before", false],
  ["you", false],
  ["apply.", false]
];

const freeFeatures = [
  "3 analyses per day",
  "3 improvements per day",
  "2 saved resume variants",
  "PDF export included",
  "Basic score and keyword feedback"
];

export default function Home() {
  return (
    <SiteChrome>
      <main>
        <div className="hero-wrap">
          <section className="shell hero">
            <div className="hero-left">
              <div className="eyebrow">Private resume tailoring on iPhone</div>
              <h1 className="hero-title">
                {heroWords.map(([word, highlighted], index) => (
                  <Fragment key={word}>
                    <span className="hw">
                      <span className={`hw-inner${highlighted ? " hl" : ""}`} style={{ "--i": index } as CSSProperties}>{word}</span>
                    </span>
                    {index < heroWords.length - 1 ? " " : ""}
                  </Fragment>
                ))}
              </h1>
              <p className="lead">
                Rezumate is the private iPhone resume optimizer that scores your resume against a job description,
                identifies missing keywords and weak bullets, then exports a polished ATS-safe PDF.
              </p>
              <div className="actions">
                <a className="button button-shine" href="#free-check">Check your resume free</a>
                <a className="button secondary" href={ctaHref}>Download on the App Store</a>
              </div>
              <ul className="hero-assurance" aria-label="Browser preview">
                <li>No account</li>
                <li>No resume upload</li>
                <li>No payment</li>
              </ul>

              <div className="offer-strip" aria-label="Lifetime pricing">
                <span className="offer-label">Lifetime Pro</span>
                <strong>$14.99</strong>
                <span className="offer-note">One-time purchase. Localized App Store pricing may vary.</span>
              </div>
            </div>

            <div className="phone-wrap">
              <HeroDemo />
            </div>

            <div className="proof-grid hero-proof" aria-label="Product proof points">
              {proofStats.map(([value, label]) => (
                <div className="proof-tile" key={value}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <ResumeCheck />

        <TapeMarquee />

        <TestimonialMarquee />

        <ProofStory ctaHref={ctaHref} />

        <HowItWorks steps={guideSteps} ctaHref={ctaHref} />

        <FeatureBento />

        <section className="band comparison-band">
          <div className="shell">
            <ScrollReveal>
              <p className="eyebrow">Why one-time pricing works</p>
              <RevealHeading>No monthly resume tax. No cloud AI meter.</RevealHeading>
              <p className="lead faq-lead">
                Most tools charge every month because the product runs on rented servers. Rezumate runs locally,
                so Pro can be a one-time unlock instead of a subscription.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="comparison-table" role="table" aria-label="Rezumate comparison">
                <div className="comparison-row comparison-head" role="row">
                  <span>Category</span>
                  <span>Rezumate</span>
                  <span>Cloud builders</span>
                  <span>ATS checkers</span>
                </div>
                {comparison.map((row) => (
                  <div className="comparison-row" role="row" key={row[0]}>
                    {row.map((cell) => <span role="cell" key={cell}>{cell}</span>)}
                  </div>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <CostCalculator />
            </ScrollReveal>
          </div>
        </section>

        <section id="pricing" className="band pricing-band">
          <div className="shell">
            <ScrollReveal>
              <p className="eyebrow">Simple lifetime pricing</p>
              <RevealHeading>Get the lifetime Pro unlock for $14.99.</RevealHeading>
              <p className="lead faq-lead">
                Pay once with no subscription or credit packs. Localized App Store pricing may vary.
              </p>
            </ScrollReveal>
            <ScrollReveal stagger className="pricing-grid">
              <article className="pricing-card">
                <div className="pricing-card-head">
                  <h3>Free</h3>
                  <span className="pricing-badge neutral">Try first</span>
                </div>
                <strong className="pricing-price">$0</strong>
                <p>Useful enough to test the workflow before you upgrade.</p>
                <ul>
                  {freeFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>

              <article className="pricing-card pricing-card-pro">
                <svg className="price-stamp" viewBox="0 0 120 120" aria-hidden="true">
                  <defs>
                    <path id="stamp-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
                  </defs>
                  <circle cx="60" cy="60" r="58" />
                  <text><textPath href="#stamp-circle" textLength="274" lengthAdjust="spacing">PAY ONCE ✦ OWN IT ✦ PAY ONCE ✦ OWN IT ✦</textPath></text>
                  <text className="price-stamp-center" x="60" y="68" textAnchor="middle">✦</text>
                </svg>
                <div className="pricing-card-head">
                  <h3>Pro lifetime</h3>
                </div>
                <div className="price-stack">
                  <strong className="pricing-price">$14.99</strong>
                  <span className="pricing-once">One-time purchase. No subscription.</span>
                </div>
                <p>For people who are applying seriously and do not want to ration resume checks.</p>
                <ul>
                  {proFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a className="button button-shine pricing-cta" href={ctaHref}>Get Rezumate Pro</a>
              </article>
            </ScrollReveal>
          </div>
        </section>

        <section className="final-cta">
          <div className="final-cta-backdrop" aria-hidden="true">
            <div className="final-cta-track">
              {[0, 1].map((copy) => (
                <span key={copy}>Upload ✦ Analyze ✦ Improve ✦ Export ✦&nbsp;</span>
              ))}
            </div>
          </div>
          <div className="shell final-cta-inner">
            <div>
              <p className="eyebrow">Before you apply again</p>
              <RevealHeading>Run the resume through Rezumate first.</RevealHeading>
              <p className="lead">
                A generic resume can miss the exact words recruiters search for. Rezumate is available now, so you can tailor
                every application locally on your iPhone before you submit it.
              </p>
            </div>
            <a className="button final-button" href={ctaHref}>Download on the App Store</a>
          </div>
        </section>

        <section id="faq" className="band faq-band">
          <div className="shell">
            <ScrollReveal>
              <p className="eyebrow">FAQ</p>
              <RevealHeading>Questions about Rezumate</RevealHeading>
              <p className="lead faq-lead">
                Rezumate is built for one workflow: upload, analyze, improve, and export,
                without compromising your privacy, showing ads, or uploading your CV to a cloud server.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <FaqList items={featuredFaqItems} idPrefix="home-faq" />
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="faq-more">
                <Link className="button secondary" href="/faq">View all questions</Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <MobileCtaBar ctaHref={ctaHref} />
    </SiteChrome>
  );
}
