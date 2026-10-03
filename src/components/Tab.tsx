import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** record: the yellow tab of a personal record. */
  tone?: 'pedana' | 'record';
}

/** The wood tab of the lower third: a short label or number, right edge cut at the italic angle. */
export function Tab({ children, tone = 'pedana', className = '', ...rest }: Props) {
  const color = tone === 'record' ? 'bg-plate-yellow' : 'bg-pedana';
  return (
    <span
      {...rest}
      className={`cut-right inline-flex shrink-0 items-center gap-1 rounded-l-tag pl-2 text-arena ${color} ${className}`}
    >
      {children}
    </span>
  );
}
