import Link from "next/link";

import { FaqList } from "./components/FaqList";
import { featuredFaqItems } from "./components/faq-data";
import { SiteChrome } from "./components/SiteChrome";

const features = [
  ["ATS match score", "Get a role-specific ATS-style score built from keyword coverage, impact quality, structure, and formatting — calculated instantly on-device."],
  ["Score improvement (+30 pts avg)", "After optimizing, see your before → after score delta. Missing keywords are injected directly into your skills section, pushing keyword coverage from ~60% to 95%+."],
  ["Missing keyword detection", "Extract every skill, framework, and tool the job description expects but your resume lacks — then add them all in a single tap."],
  ["Bullet strengthening", "Weak, passive bullets get upgraded with action verbs, measurable impact signals, and relevant keywords that the ATS scorer actually checks for."],
  ["Professional PDF export", "Every improved resume is formatted using a clean, professional LaTeX-style template: centered name header, section rules, tabular experience entries, and ATS-safe typography."],
  ["100% private & offline", "Your name, phone number, email, and career history never leave your device. No cloud analysis, no accounts required, no trackers."]
];

const steps = [
  ["01", "Upload", "PDF or DOCX"],
  ["02", "Analyze", "Get your ATS score"],
  ["03", "Improve", "Inject keywords & fix bullets"],
  ["04", "Export", "Download LaTeX-style PDF"],
];

export default function Home() {
  return (
    <SiteChrome>
      <main>
        <section className="shell hero">
          <div className="hero-left">
            <div className="eyebrow">Private On-Device ATS Optimization · Coming to iPhone</div>
            <h1>Tailor your resume. 100% privately.</h1>
            <p className="lead">
              Upload any resume, paste a job description, and watch your ATS score jump —
              on average 30+ points — without sending your career history to a cloud server.
            </p>
            <div className="actions">
              <a
                className="button"
                href="mailto:aftaab2507@gmail.com?subject=Notify me when Rezumate launches on the App Store"
              >
                Notify Me on Launch
              </a>
              <Link className="button secondary" href="/privacy">Privacy Policy</Link>
            </div>

            <div className="hero-steps">
              {steps.map(([num, label, sub]) => (
                <div className="hero-step" key={num}>
                  <span className="hero-step-num">{num}</span>
                  <div>
                    <strong>{label}</strong>
                    <span>{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="phone-wrap">
            <div className="phone" aria-label="Rezumate app preview">
              <div className="phone-island" aria-hidden="true" />
              <div className="screen">

                <div className="screen-tabs">
                  <span className="screen-tab">Upload</span>
                  <span className="screen-tab screen-tab-active">Results</span>
                  <span className="screen-tab">History</span>
                </div>

                <div className="score-card">
                  <div className="score-card-top">
                    <div className="score-label">ATS Match Score</div>
                    <span className="optimized-badge">Optimized ✓</span>
                  </div>
                  <div className="score-numbers">
                    <div className="score-before-col">
                      <span className="score-was-label">Before</span>
                      <span className="score-was-num">55</span>
                    </div>
                    <div className="score-arrow-col">→</div>
                    <div className="score-after-col">
                      <span className="score-now-label">After</span>
                      <div className="score-now-row">
                        <strong className="score-now-num">87</strong>
                        <em>/100</em>
                      </div>
                    </div>
                    <span className="score-delta">+32 pts</span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div className="progress-fill" style={{ width: "87%" }} />
                  </div>
                </div>

                <div className="screen-section">
                  <div className="screen-section-header">
                    <span className="section-label">Keywords injected</span>
                    <span className="screen-badge-count">+4</span>
                  </div>
                  <div className="chips">
                    <span className="chip chip-added">Docker</span>
                    <span className="chip chip-added">Kubernetes</span>
                    <span className="chip chip-added">TypeScript</span>
                    <span className="chip chip-added">CI/CD</span>
                  </div>
                </div>

                <div className="bullet-diff">
                  <div className="bullet-diff-row bullet-diff-before">
                    <span className="diff-tag">Before</span>
                    <p>Worked on backend services and APIs</p>
                  </div>
                  <div className="bullet-diff-row bullet-diff-after">
                    <span className="diff-tag diff-tag-after">After</span>
                    <p>Engineered backend APIs using Docker across 3+ environments, improving delivery speed by 25%</p>
                  </div>
                </div>

                <div className="screen-export-btn">
                  View &amp; Download LaTeX PDF →
                </div>

                <div className="phone-home-indicator" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="band">
          <div className="shell">
            <h2>Every feature runs locally on your iPhone</h2>
            <div className="grid">
              {features.map(([title, copy], index) => (
                <article className="card" key={title}>
                  <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="band faq-band">
          <div className="shell">
            <p className="eyebrow">FAQ</p>
            <h2>Questions about Rezumate</h2>
            <p className="lead faq-lead">
              Rezumate is built for one workflow: upload, analyze, improve, and export —
              without compromising your privacy, showing ads, or uploading your CV to a cloud server.
            </p>
            <FaqList items={featuredFaqItems} idPrefix="home-faq" />
            <div className="faq-more">
              <Link className="button secondary" href="/faq">View all questions</Link>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
