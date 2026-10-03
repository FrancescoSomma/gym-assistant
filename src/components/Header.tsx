import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Header({
  title,
  back,
  right,
  large = false,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
  /** The four tabs: a 34px title in the plate face. */
  large?: boolean;
}) {
  return (
    <header className={`flex items-center gap-1 px-4 ${large ? 'min-h-16 pt-2' : 'min-h-14'}`}>
      {back && (
        <Link
          to={back}
          state={{ dir: 'back' }}
          aria-label="Indietro"
          className="-ml-3 flex size-11 items-center justify-center active:opacity-60"
        >
          <ChevronLeft />
        </Link>
      )}
      <h1 className={`plate flex-1 truncate ${large ? 'text-large' : 'text-title'}`}>{title}</h1>
      {right}
    </header>
  );
}
