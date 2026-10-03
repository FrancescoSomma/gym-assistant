import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const features = () => import('./motionFeatures').then((module) => module.default);

/**
 * Only m.* components inside (strict), with the features loaded lazily. reducedMotion "user"
 * turns transform and layout animations off under prefers-reduced-motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
