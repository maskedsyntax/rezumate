import Link from "next/link";

import { FaqList } from "./components/FaqList";
import { ScrollReveal } from "./components/ScrollReveal";
import { featuredFaqItems } from "./components/faq-data";
import { SiteChrome } from "./components/SiteChrome";
import { APP_STORE_URL } from "../lib/app-store";

const ctaHref = APP_STORE_URL;

const proofStats = [
  ["100% local", "Resume parsing, scoring, keyword checks, rewrites, history, and PDF export run on your iPhone."],
  ["Truthful improvements", "Weak wording is strengthened without adding skills, metrics, or achievements that are not already in your resume."],
  ["No account", "Open the app, upload a resume, paste a job description, and start tailoring."]
];

const features = [
  ["ATS match score", "A role-specific score built from keyword coverage, impact quality, structure, readability, and formatting risk."],
  ["Full score diagnosis", "Pro users can open each score component and see why it matters, what is missing, and what to fix next."],
  ["Missing keyword detection", "Rezumate extracts skills, tools, frameworks, and role terms from the job description and compares them with your resume."],
  ["Bullet strengthening", "Weak bullets receive conservative wording improvements based only on content already present in your resume."],
  ["Resume improvement engine", "One tap strengthens supported wording, refreshes the score, and saves the improved variant without inventing qualifications."],
  ["LaTeX-style PDF export", "Export a clean ATS-safe PDF with centered header, section rules, tabular experience entries, and selectable text."],
  ["Private local history", "Saved resume variants and scoring history stay inside local sandboxed storage on your device."],
  ["Free daily usage", "Start with 3 analyses/day, 3 improvements/day, 2 saved variants, and PDF export included."],
  ["Unlimited Pro unlock", "Pay once for unlimited analyses, improvements, variants, full diagnosis, and complete keyword insights."]
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
        <section className="shell hero">
          <div className="hero-left">
            <div className="eyebrow">Private resume tailoring on iPhone</div>
            <h1>Tailor every resume before you apply.</h1>
            <p className="lead">
              Rezumate is the private iPhone resume optimizer that scores your resume against a job description,
              identifies missing keywords and weak bullets, then exports a polished ATS-safe PDF.
            </p>
            <div className="offer-strip" aria-label="Lifetime pricing">
              <span className="offer-label">Lifetime Pro</span>
              <strong>$14.99</strong>
              <span className="offer-note">One-time purchase. Localized App Store pricing may vary.</span>
            </div>
            <div className="actions">
              <a className="button" href={ctaHref}>Download on the App Store</a>
              <a className="button secondary" href="#how-it-works">See How It Works</a>
            </div>

            <div className="proof-grid" aria-label="Product proof points">
              {proofStats.map(([value, label]) => (
                <div className="proof-tile" key={value}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="phone-wrap">
            <div className="phone" aria-label="Rezumate app preview">
              <div className="phone-island" aria-hidden="true" />
              <div className="screen">

                <div className="app-header">
                  <div className="app-header-left">
                    <img src="/rezumate-logo.svg" alt="" className="app-logo" />
                    <div>
                      <strong>Rezumate</strong>
                      <span>Results</span>
                    </div>
                  </div>
                  <span className="app-badge optimized-badge">✓ Optimized</span>
                </div>

                <div className="score-card">
                  <div className="score-label">ATS Match Score</div>
                  <div className="sc-main">
                    <span className="sc-big">87<em>/100</em></span>
                    <span className="sc-gain">+32 pts</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div className="progress-fill" style={{ width: "87%" }} />
                  </div>
                  <div className="sc-from">Improved from 55</div>
                </div>

                <div className="screen-section">
                  <div className="section-label">Missing keyword recommendations</div>
                  <div className="chips" style={{ marginTop: "5px" }}>
                    <span className="chip chip-added">Docker</span>
                    <span className="chip chip-added">Kubernetes</span>
                    <span className="chip chip-added">TypeScript</span>
                    <span className="chip chip-added">CI/CD</span>
                  </div>
                </div>

                <div className="bullet-improve-card">
                  <div className="bi-tag">✦ Bullet strengthened</div>
                  <p className="bi-text">
                    Contributed to backend API development using the tools and
                    experience already documented in the resume
                  </p>
                </div>

                <div className="screen-export-btn">
                  View &amp; Download LaTeX PDF
                </div>

                <div className="phone-home-indicator" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section className="ticker-band" aria-label="Product details">
          <div className="shell ticker-grid">
            <div>
              <span className="ticker-kicker">Lifetime Pro</span>
              <strong>$14.99 one-time</strong>
            </div>
            <div>
              <span className="ticker-kicker">Suggestions</span>
              <strong>No invented claims</strong>
            </div>
            <div>
              <span className="ticker-kicker">Billing</span>
              <strong>Pay once</strong>
            </div>
            <div>
              <span className="ticker-kicker">Privacy</span>
              <strong>No cloud resume upload</strong>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="band guide-band">
          <div className="shell split-section">
            <ScrollReveal>
              <p className="eyebrow">How to use Rezumate</p>
              <h2>A practical workflow for every job application.</h2>
              <p className="lead faq-lead">
                Rezumate is not another template gallery. It is built around the exact sequence job seekers repeat:
                compare the resume to the job, close the gaps, and export a version ready to submit.
              </p>
              <a className="button" href={ctaHref}>Download on the App Store</a>
            </ScrollReveal>
            <ScrollReveal stagger className="guide-list">
              {guideSteps.map(([title, copy], index) => (
                <article className="guide-item" key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </article>
              ))}
            </ScrollReveal>
          </div>
        </section>

        <section id="features" className="band">
          <div className="shell">
            <ScrollReveal>
              <p className="eyebrow">What the app includes</p>
              <h2>Everything shown in the app, built into one local resume workspace.</h2>
            </ScrollReveal>
            <ScrollReveal stagger className="grid">
              {features.map(([title, copy], index) => (
                <article className="card" key={title}>
                  <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </ScrollReveal>
          </div>
        </section>

        <section className="band comparison-band">
          <div className="shell">
            <ScrollReveal>
              <p className="eyebrow">Why one-time pricing works</p>
              <h2>No monthly resume tax. No cloud AI meter.</h2>
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
          </div>
        </section>

        <section id="pricing" className="band pricing-band">
          <div className="shell">
            <ScrollReveal>
              <p className="eyebrow">Simple lifetime pricing</p>
              <h2>Get the lifetime Pro unlock for $14.99.</h2>
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
                <div className="pricing-card-head">
                  <h3>Pro lifetime</h3>
                  <span className="pricing-badge">Pay once</span>
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
                <a className="button pricing-cta" href={ctaHref}>Get Rezumate Pro</a>
              </article>
            </ScrollReveal>
          </div>
        </section>

        <section className="final-cta">
          <div className="shell final-cta-inner">
            <div>
              <p className="eyebrow">Before you apply again</p>
              <h2>Run the resume through Rezumate first.</h2>
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
              <h2>Questions about Rezumate</h2>
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
    </SiteChrome>
  );
}
