import React from 'react';
import { useInView } from './useInView';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** Fades and lifts its content in on first scroll into view. Reduced-motion users see it immediately. */
export const Reveal: React.FC<RevealProps> = ({ children, className = '', delay = 0 }) => {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '0px 0px -10% 0px' });
  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-[opacity,translate] duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
};
