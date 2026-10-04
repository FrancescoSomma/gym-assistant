const SHAPE = {
  first: 'top-3 bottom-0 border-t-[1.5px]',
  middle: 'inset-y-0',
  last: 'top-0 bottom-3 border-b-[1.5px]',
} as const;

/** Wood bracket in the left gutter of a `relative` row, joining the exercises of a superset. */
export function SupersetBracket({
  position,
}: {
  position: 'first' | 'middle' | 'last' | undefined;
}) {
  if (!position) return null;
  return (
    <span
      aria-hidden="true"
      className={`absolute left-1.5 w-1.5 border-l-[1.5px] border-pedana ${SHAPE[position]}`}
    />
  );
}
