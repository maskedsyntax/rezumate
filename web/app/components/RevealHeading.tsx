'use client';

import { Fragment, type CSSProperties } from 'react';

import { useInView } from './motion';

type Props = {
  children: string;
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
};

/** Heading whose words rise out of a mask when it scrolls into view. */
export function RevealHeading({ children, as: Tag = 'h2', id, className = '' }: Props) {
  const [ref, inView] = useInView<HTMLHeadingElement>({ threshold: 0.35 });
  const words = children.split(' ');

  return (
    <Tag ref={ref} id={id} className={`split-heading${inView ? ' is-in' : ''} ${className}`.trim()}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="sh-word">
            <span className="sh-inner" style={{ '--i': index } as CSSProperties}>{word}</span>
          </span>
          {index < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  );
}
