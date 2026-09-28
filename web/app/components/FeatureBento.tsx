import type { CSSProperties } from "react";

import { RevealHeading } from "./RevealHeading";
import { ScrollReveal } from "./ScrollReveal";

type Feature = {
  area: string;
  title: string;
  copy: string;
  glyph: string;
  visual?: React.ReactNode;
};

const meters = [
  ["Keyword coverage", "45%", 82],
  ["Impact quality", "25%", 68],
  ["Structure", "20%", 91],
  ["Formatting", "10%", 96]
] as const;

const keywordChips = [
  ["Python", true],
  ["REST APIs", true],
  ["Docker", false],
  ["PostgreSQL", true],
  ["AWS", false],
  ["React", true],
  ["CI/CD", false]
] as const;

const features: Feature[] = [
  {
    area: "ats",
    glyph: "◎",
    title: "ATS match score",
    copy: "A role-specific score built from keyword coverage, impact quality, structure, readability, and formatting risk.",
    visual: (
      <div className="fv-meters" aria-hidden="true">
        {meters.map(([label, weight, value], index) => (
          <div className="fv-meter" key={label} style={{ "--i": index, "--w": `${value}%` } as CSSProperties}>
            <span>{label}<em>{weight}</em></span>
            <div><i /></div>
          </div>
        ))}
        <small>Example values</small>
      </div>
    )
  },
  {
    area: "kw",
    glyph: "⊕",
    title: "Missing keyword detection",
    copy: "Rezumate extracts skills, tools, frameworks, and role terms from the job description and compares them with your resume.",
    visual: (
      <div className="fv-kw" aria-hidden="true">
        <p className="fv-jd">
          …develop <mark>REST APIs</mark> with <mark>Python</mark> and <mark>PostgreSQL</mark>, build <mark>React</mark> interfaces.
          Experience with <mark className="gap">Docker</mark>, <mark className="gap">AWS</mark>, and automated <mark className="gap">CI/CD</mark> is valued…
        </p>
      <div className="fv-chips">
        {keywordChips.map(([label, matched], index) => (
          <span className={matched ? "matched" : "missing"} key={label} style={{ "--i": index } as CSSProperties}>
            {matched ? "✓" : "+"} {label}
          </span>
        ))}
      </div>
        <div className="fv-kw-summary">
          <span>4 of 7 role terms found</span>
          <div><i /></div>
        </div>
      </div>
    )
  },
  {
    area: "diag",
    glyph: "▦",
    title: "Full score diagnosis",
    copy: "Pro users can open each score component and see why it matters, what is missing, and what to fix next."
  },
  {
    area: "bullet",
    glyph: "✦",
    title: "Bullet strengthening",
    copy: "Weak bullets receive conservative wording improvements based only on content already present in your resume.",
    visual: (
      <div className="fv-swap" aria-hidden="true">
        <p><s>Worked on</s><i>→</i><b>Contributed to</b></p>
        <p><s>Handled</s><i>→</i><b>Managed</b></p>
      </div>
    )
  },
  {
    area: "engine",
    glyph: "↻",
    title: "Resume improvement engine",
    copy: "One tap strengthens supported wording, refreshes the score, and saves the improved variant without inventing qualifications."
  },
  {
    area: "pdf",
    glyph: "▤",
    title: "LaTeX-style PDF export",
    copy: "Export a clean ATS-safe PDF with centered header, section rules, tabular experience entries, and selectable text.",
    visual: (
      <div className="fv-doc" aria-hidden="true">
        <i className="fv-doc-name" />
        <i className="fv-doc-sub" />
        <i className="fv-doc-rule" />
        <div className="fv-doc-row"><i /><i className="date" /></div>
        <i /><i /><i className="short" />
        <i className="fv-doc-rule" />
        <div className="fv-doc-row"><i /><i className="date" /></div>
        <i /><i className="short" />
      </div>
    )
  },
  {
    area: "history",
    glyph: "◫",
    title: "Private local history",
    copy: "Saved resume variants and scoring history stay inside local sandboxed storage on your device.",
    visual: (
      <div className="fv-stack" aria-hidden="true">
        <span>Original</span>
        <span>Data analyst</span>
        <span>Backend role</span>
      </div>
    )
  },
  {
    area: "free",
    glyph: "◔",
    title: "Free daily usage",
    copy: "Start with 3 analyses/day, 3 improvements/day, 2 saved variants, and PDF export included.",
    visual: (
      <div className="fv-dots" aria-hidden="true">
        <i /><i /><i />
      </div>
    )
  },
  {
    area: "pro",
    glyph: "∞",
    title: "Unlimited Pro unlock",
    copy: "Pay once for unlimited analyses, improvements, variants, full diagnosis, and complete keyword insights."
  }
];

export function FeatureBento() {
  return (
    <section id="features" className="band features-band">
      <div className="shell">
        <p className="eyebrow">What the app includes</p>
        <RevealHeading>Everything shown in the app, built into one local resume workspace.</RevealHeading>
        <ScrollReveal stagger variant="tilt" className="bento">
          {features.map(({ area, glyph, title, copy, visual }) => (
            <article className={`bento-card bento-${area}`} key={area}>
              <span className="bento-glyph" aria-hidden="true">{glyph}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              {visual}
            </article>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
