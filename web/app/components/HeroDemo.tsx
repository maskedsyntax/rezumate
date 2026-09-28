'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

import { prefersReducedMotion } from './motion';

/*
 * A looping, illustrative walk through the app's core loop:
 * 0 scan → 1 score → 2 missing terms → 3 bullet rewrite → 4 export.
 * The server renders the finished state so the preview is meaningful without JS or motion.
 */
const STEP_DURATIONS = [1600, 1900, 1900, 2600, 2800];
const FINAL_STEP = STEP_DURATIONS.length - 1;
const SCORE = 87;
const MISSING = ['Docker', 'Kubernetes', 'TypeScript', 'CI/CD'];

const badgeByStep = ['Analyzing', 'Scored', 'Scored', '✓ Improved', '✓ Improved'];

export function HeroDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(FINAL_STEP);
  const [score, setScore] = useState(SCORE);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = rootRef.current;
    if (!el) return;
    let visible = true;
    const sync = () => setRunning(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);
    setStep(0);
    setScore(0);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setStep((current) => (current + 1) % STEP_DURATIONS.length), STEP_DURATIONS[step]);
    return () => window.clearTimeout(timer);
  }, [running, step]);

  useEffect(() => {
    if (step === 0) {
      setScore(0);
      return;
    }
    if (step !== 1) return;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1300);
      setScore(Math.round(SCORE * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    rootRef.current.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    rootRef.current.style.setProperty('--my', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
  }

  function handlePointerLeave() {
    rootRef.current?.style.setProperty('--mx', '0');
    rootRef.current?.style.setProperty('--my', '0');
  }

  const on = (from: number) => (step >= from ? ' on' : '');

  return (
    <div
      ref={rootRef}
      className="hero-stage"
      data-step={step}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="stage-paper" aria-hidden="true">
        <div className="paper-head">
          <strong>Alex Rivera</strong>
          <span>Software Engineer</span>
        </div>
        <div className="paper-rule">Experience</div>
        <p className="paper-line">
          Built REST <mark className={`kw${on(1)}`} style={{ '--i': 0 } as CSSProperties}>APIs</mark> with{' '}
          <mark className={`kw${on(1)}`} style={{ '--i': 1 } as CSSProperties}>Python</mark> and{' '}
          <mark className={`kw${on(1)}`} style={{ '--i': 2 } as CSSProperties}>PostgreSQL</mark>
        </p>
        <p className="paper-line">
          <span className={`paper-verb${on(3)}`}>Worked on</span> backend services
        </p>
        <div className="paper-bars"><i /><i /><i /></div>
        <div className="paper-rule">Skills</div>
        <p className="paper-line">
          <mark className={`kw${on(1)}`} style={{ '--i': 3 } as CSSProperties}>React</mark>,{' '}
          <mark className={`kw${on(1)}`} style={{ '--i': 4 } as CSSProperties}>Git</mark>,{' '}
          <span className={`kw-gap${on(2)}`}>Docker?</span>
        </p>
        <div className="paper-bars short"><i /><i /></div>
        <div className="paper-scan" />
      </div>

      <div className="phone" aria-label="Illustrative Rezumate app preview">
        <div className="phone-island" aria-hidden="true" />
        <div className="screen">
          <div className="screen-scan" aria-hidden="true" />

          <div className="app-header">
            <div className="app-header-left">
              <img src="/rezumate-logo.svg" alt="" className="app-logo" />
              <div>
                <strong>Rezumate</strong>
                <span>Results</span>
              </div>
            </div>
            <span className={`app-badge optimized-badge badge-step-${Math.min(step, 3)}`}>{badgeByStep[step]}</span>
          </div>

          <div className="score-card">
            <div className="score-label">Example ATS Match Score</div>
            <div className="sc-main">
              <span className="sc-big">{step === 0 ? '--' : score}<em>/100</em></span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ transform: `scaleX(${score / 100})` }} />
            </div>
            <div className="sc-from">Illustrative interface preview</div>
          </div>

          <div className="screen-section">
            <div className="section-label">Missing keyword recommendations</div>
            <div className="chips">
              {MISSING.map((keyword, index) => (
                <span className={`chip chip-added${on(2)}`} key={keyword} style={{ '--i': index } as CSSProperties}>{keyword}</span>
              ))}
            </div>
          </div>

          <div className={`bullet-improve-card${on(3)}`}>
            <div className="bi-tag">✦ Bullet strengthened</div>
            <p className="bi-text">
              <span className="bi-old">Worked on</span>
              <span className="bi-new">Contributed to</span> backend API development using tools already documented in the resume
            </p>
          </div>

          <div className={`screen-export-btn${on(4)}`}>
            <span className="export-idle">View &amp; Download LaTeX PDF</span>
            <span className="export-done">✓ PDF ready to review</span>
          </div>

          <div className="phone-home-indicator" aria-hidden="true" />
        </div>
      </div>

      <div className={`stage-note note-match${on(1)}`} aria-hidden="true">✓ Python matched</div>
      <div className={`stage-note note-gap${on(2)}`} aria-hidden="true">Docker: only if you have it</div>
      <div className={`stage-note note-verb${on(3)}`} aria-hidden="true"><s>Worked on</s> Contributed to</div>
      <div className={`stage-note note-pdf${on(4)}`} aria-hidden="true">ATS-safe PDF</div>
    </div>
  );
}
