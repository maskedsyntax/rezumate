'use client';

import { RevealHeading } from './RevealHeading';
import { useInView } from './motion';

export function ProofStory({ ctaHref }: { ctaHref: string }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });

  return (
    <section className="band proof-story-band" aria-labelledby="proof-story-heading">
      <div className="shell">
        <p className="eyebrow">A transparent example</p>
        <RevealHeading id="proof-story-heading">Show the gap. Make a truthful change. Export.</RevealHeading>
        <p className="lead">This sample shows the kind of feedback Rezumate gives. The app never adds a skill or outcome without your review.</p>
        <div ref={ref} className={`proof-story-grid${inView ? ' is-in' : ''}`}>
          <article className="proof-story-card">
            <span className="proof-story-step">01 / Compare with the role</span>
            <h3>Spot the actual gap</h3>
            <p>The job asks for Docker. The sample resume mentions Python and PostgreSQL, but not Docker. Rezumate marks it for review instead of inserting it automatically.</p>
            <div className="proof-story-pills"><span>Python · matched</span><span>Docker · review</span></div>
          </article>
          <article className="proof-story-card">
            <span className="proof-story-step">02 / Improve wording</span>
            <h3>Keep every fact intact</h3>
            <div className="proof-story-edit">
              <small>Before</small>
              <p><span className="ps-old">Worked on</span> backend API development.</p>
              <small className="ps-after-label">After</small>
              <p className="ps-after"><span className="ps-new">Contributed to</span> backend API development.</p>
            </div>
            <p>This verb change follows the app’s current local writing rule. It adds no result, metric, or employer.</p>
          </article>
          <article className="proof-story-card">
            <span className="proof-story-step">03 / Finish on iPhone</span>
            <h3>Review the final PDF</h3>
            <p>Confirm any skill you really have, inspect the updated score, save a role-specific version, and export a selectable-text PDF on your device.</p>
            <div className="ps-doc" aria-hidden="true">
              <i className="ps-doc-name" />
              <i className="ps-doc-rule" />
              <i /><i /><i className="short" />
              <i className="ps-doc-rule" />
              <i /><i className="short" />
              <span className="ps-doc-stamp">PDF</span>
            </div>
            <a href={ctaHref}>See the app on the App Store <span aria-hidden="true">→</span></a>
          </article>
        </div>
        <p className="proof-story-note">Sample content demonstrates the workflow; it is not a customer result or an interview guarantee.</p>
      </div>
    </section>
  );
}
