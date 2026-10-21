import React from 'react';
import { X } from 'lucide-react';

interface AIAccessGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle: string;
  featureDescription: string;
}

// Shown instead of an AI feature when the browsing reader isn't at least a
// Bookatlas Plus Member — reuses TierAccessGate purely for its locked-state
// card (this modal is only ever mounted when access is already known to be
// denied, so TierAccessGate's own children/hasAccess branch never fires).
export const AIAccessGateModal: React.FC<AIAccessGateModalProps> = ({
  isOpen,
  onClose,
  featureTitle,
  featureDescription,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-xs" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="access-gate-title" className="relative w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-slate-950 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close membership information"
          className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Bookatlas Plus membership required</p>
        <h2 id="access-gate-title" className="pr-8 text-2xl font-bold">{featureTitle}</h2>
        <p className="text-sm leading-relaxed text-slate-700">{featureDescription}</p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          Membership enrollment is unavailable while checkout is a demo. Signing in does not grant Plus access.
        </div>
        <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-indigo-700 px-4 font-bold text-white">Back to browsing</button>
      </section>
    </div>
  );
};
