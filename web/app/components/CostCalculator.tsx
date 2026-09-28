'use client';

import { useState, type CSSProperties } from 'react';

import { useInView, useTweenedNumber } from './motion';

const LOW = 15;
const HIGH = 30;
const PRO = 14.99;
const MAX_MONTHS = 12;
const SCALE = HIGH * MAX_MONTHS;

const money = (value: number) => `$${Math.round(value)}`;

export function CostCalculator() {
  const [months, setMonths] = useState(3);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
  const low = useTweenedNumber(LOW * months);
  const high = useTweenedNumber(HIGH * months);
  const saved = Math.max(0, high - PRO);
  const fill = inView ? 1 : 0;

  return (
    <div ref={ref} className={`cost-calc${inView ? ' is-in' : ''}`}>
      <div className="cost-head">
        <label htmlFor="search-months">How long could your job search take?</label>
        <output htmlFor="search-months">{months} {months === 1 ? 'month' : 'months'}</output>
      </div>
      <input
        id="search-months"
        type="range"
        min={1}
        max={MAX_MONTHS}
        value={months}
        onChange={(event) => setMonths(Number(event.target.value))}
        style={{ '--fill': `${((months - 1) / (MAX_MONTHS - 1)) * 100}%` } as CSSProperties}
      />
      <div className="cost-rows">
        <div className="cost-row">
          <span className="cost-label">Monthly resume subscription</span>
          <div className="cost-bar">
            <i className="cost-high" style={{ width: `${(high / SCALE) * 100 * fill}%` }} />
            <i className="cost-low" style={{ width: `${(low / SCALE) * 100 * fill}%` }} />
          </div>
          <strong>{money(low)}–{money(high)}</strong>
        </div>
        <div className="cost-row cost-row-pro">
          <span className="cost-label">Rezumate Pro</span>
          <div className="cost-bar">
            <i className="cost-pro" style={{ width: `${(PRO / SCALE) * 100 * fill}%` }} />
          </div>
          <strong>$14.99 once</strong>
        </div>
      </div>
      <p className="cost-saved" aria-live="polite">
        {saved > 1 ? <>Up to <strong>{money(saved)}</strong> stays in your pocket.</> : <>Pro costs about the same as one month.</>}
      </p>
      <p className="cost-note">Uses the $15–30/month range from the table above. Localized App Store pricing may vary.</p>
    </div>
  );
}
