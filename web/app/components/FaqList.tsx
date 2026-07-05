'use client';

import { useState } from 'react';

import type { FaqItem, FaqSection } from './faq-data';

function FaqAccordionItem({ item, id }: { item: FaqItem; id: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? ' faq-open' : ''}`} id={id}>
      <button
        className="faq-summary"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{item.question}</span>
        <span className="faq-icon" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div className="faq-body">
        <div className="faq-body-inner">
          <div className="faq-answer">
            <p>{item.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  sections?: FaqSection[];
  items?: FaqItem[];
  idPrefix?: string;
};

export function FaqList({ sections, items, idPrefix = 'faq' }: Props) {
  if (sections) {
    return (
      <div className="faq-sections">
        {sections.map((section) => (
          <section className="faq-group" key={section.title}>
            <h2 className="faq-group-title">{section.title}</h2>
            <FaqList
              items={section.items}
              idPrefix={`${idPrefix}-${section.title.toLowerCase()}`}
            />
          </section>
        ))}
      </div>
    );
  }

  if (!items?.length) return null;

  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <FaqAccordionItem
          key={item.question}
          item={item}
          id={`${idPrefix}-${index + 1}`}
        />
      ))}
    </div>
  );
}
