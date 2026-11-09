import React from 'react';

/** The four-point compass star from the A in the BookAtlas logo. */
export const AtlasStar: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
    <path d="M12 0 13.9 10.1 24 12 13.9 13.9 12 24 10.1 13.9 0 12 10.1 10.1Z" />
  </svg>
);
