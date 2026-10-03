import type { ReactNode } from 'react';

/** The light plate of the lower third: the exercise name in the plate face, two lines at most. */
export function NamePlate({
  children,
  as: Tag = 'h1',
  className = '',
}: {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'p';
  className?: string;
}) {
  return (
    <Tag
      className={`plate line-clamp-2 min-w-0 bg-luce px-2.5 py-1 text-name text-arena ${className}`}
    >
      {children}
    </Tag>
  );
}
