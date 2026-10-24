'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { EASE, DURATION } from './motion';

export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number; // milliseconds, staggered entrances
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={`reveal ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: DURATION.slow, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}
