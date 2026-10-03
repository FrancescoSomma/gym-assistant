import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Header({
  title,
  back,
  right,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center gap-1 px-4">
      {back && (
        <Link
          to={back}
          aria-label="Indietro"
          className="-ml-3 flex size-11 items-center justify-center"
        >
          <ChevronLeft />
        </Link>
      )}
      <h1 className="flex-1 truncate text-title font-semibold">{title}</h1>
      {right}
    </header>
  );
}
