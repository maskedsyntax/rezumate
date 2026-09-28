'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { RevealHeading } from './RevealHeading';

type Props = {
  steps: string[][];
  ctaHref: string;
};

export function HowItWorks({ steps, ctaHref }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const list = listRef.current;
      if (!list) return;
      const anchor = window.innerHeight * 0.6;
      const rect = list.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (anchor - rect.top) / rect.height)));
      let current = -1;
      list.querySelectorAll('.guide-item').forEach((item, index) => {
        if (item.getBoundingClientRect().top + 24 < anchor) current = index;
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const shown = Math.max(0, active) + 1;

  return (
    <section id="how-it-works" className="band guide-band">
      <div className="shell split-section">
        <div className="guide-sticky">
          <p className="eyebrow">How to use Rezumate</p>
          <RevealHeading>A practical workflow for every job application.</RevealHeading>
          <p className="lead faq-lead">
            Rezumate is not another template gallery. It is built around the exact sequence job seekers repeat:
            compare the resume to the job, close the gaps, and export a version ready to submit.
          </p>
          <div className="guide-counter" aria-hidden="true">
            <span key={shown} className="guide-counter-num">{String(shown).padStart(2, '0')}</span>
            <span className="guide-counter-total">/ {String(steps.length).padStart(2, '0')}</span>
          </div>
          <a className="button" href={ctaHref}>Download on the App Store</a>
        </div>
        <ol ref={listRef} className="guide-list" style={{ '--progress': progress } as CSSProperties}>
          {steps.map(([title, copy], index) => (
            <li className={`guide-item${index <= active ? ' is-active' : ''}`} key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
