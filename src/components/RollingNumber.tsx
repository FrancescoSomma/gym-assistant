import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';

const slide = {
  enter: (dir: number) => ({ y: `${dir * 100}%`, opacity: 0 }),
  center: { y: '0%', opacity: 1 },
  exit: (dir: number) => ({ y: `${dir * -100}%`, opacity: 0 }),
};

/**
 * The text of a number whose changed characters roll: up when the value grows, down when it
 * shrinks. Characters are keyed from the right, so "9" → "10" rolls the units and brings in the
 * tens. Decorative: the surrounding element carries the accessible value.
 */
export function RollingNumber({ value, text }: { value: number | undefined; text: string }) {
  const [last, setLast] = useState({ value, dir: 1 });
  if (value !== last.value) {
    // Storing the previous value during render: React re-renders at once with the new direction.
    setLast({
      value,
      dir: value !== undefined && last.value !== undefined && value < last.value ? -1 : 1,
    });
  }
  const chars = [...text];
  return (
    <span aria-hidden="true" className="inline-flex">
      {chars.map((char, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a slot is a position counted from the right
        <span key={chars.length - i} className="relative inline-block overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={last.dir}>
            <m.span
              key={char}
              custom={last.dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block"
            >
              {char}
            </m.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
