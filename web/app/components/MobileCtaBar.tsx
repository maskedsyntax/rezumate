'use client';

import { useEffect, useState } from 'react';

export function MobileCtaBar({ ctaHref }: { ctaHref: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const nearBottom = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 320;
      setVisible(window.scrollY > 640 && !nearBottom);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className={`mobile-cta${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <a className="button secondary" href="#free-check" tabIndex={visible ? 0 : -1}>Check free</a>
      <a className="button" href={ctaHref} tabIndex={visible ? 0 : -1}>Get the app</a>
    </div>
  );
}
